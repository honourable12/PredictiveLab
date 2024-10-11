from flask import Flask, request, jsonify
from flask_jwt_extended import JWTManager, create_access_token, get_jwt_identity, jwt_required
from werkzeug.security import generate_password_hash, check_password_hash
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.svm import SVC
from sklearn.tree import DecisionTreeClassifier, DecisionTreeRegressor
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
import pickle
import json
import numpy as np
from datetime import datetime, timezone
from io import BytesIO

from config import Config
from database import db, init_db, User, MLModel, Dataset, Prediction

app = Flask(__name__)
app.config.from_object(Config)

jwt = JWTManager(app)
init_db(app)

label_encoders = {}
target_encoder = None
feature_columns = None
target_column = None
scaler = None


@app.route('/register', methods = ['POST'])
def register():
	data = request.json
	if not data or not data.get('username') or not data.get('password'):
		return jsonify({'error': 'Missing username or password'}), 400

	if User.query.filter_by(username = data['username']).first():
		return jsonify({'error': 'Username already exists'}), 400

	hashed_password = generate_password_hash(data['password'])
	new_user = User(
		username = data['username'],
		password = hashed_password,
		email = data.get('email')
	)
	db.session.add(new_user)
	db.session.commit()

	return jsonify({'message': 'User created successfully'}), 201


@app.route('/login', methods = ['POST'])
def login():
	data = request.json
	if not data or not data.get('username') or not data.get('password'):
		return jsonify({'error': 'Missing username or password'}), 400

	user = User.query.filter_by(username = data['username']).first()
	if not user or not check_password_hash(user.password, data['password']):
		return jsonify({'error': 'Invalid username or password'}), 401

	user.last_login = datetime.now(timezone.utc)
	db.session.commit()

	access_token = create_access_token(identity = user.id)
	return jsonify({'access_token': access_token}), 200


@app.route('/dataset', methods = ['POST'])
@jwt_required()
def upload_dataset():
	user_id = get_jwt_identity()
	if 'file' not in request.files:
		return jsonify({'error': 'No file provided'}), 400

	file = request.files['file']

	if not file.filename.endswith('.csv'):
		return jsonify({'error': 'Please upload a CSV file'}), 400

	try:
		df = pd.read_csv(file)

		if df.empty or df.shape[1] == 0:
			return jsonify({'error': 'Uploaded file is empty or has no columns'}), 400

	except pd.errors.EmptyDataError:
		return jsonify({'error': 'Uploaded file is empty'}), 400
	except pd.errors.ParserError:
		return jsonify({'error': 'Error parsing CSV file'}), 400
	except Exception as e:
		return jsonify({'error': f'An unexpected error occurred: {str(e)}'}), 500

	file.seek(0)
	dataset = Dataset(
		user_id = user_id,
		name = request.form.get('name', 'Unnamed Dataset'),
		description = request.form.get('description'),
		file_data = file.read(),
		columns = json.dumps(df.columns.tolist()),
		row_count = len(df)
	)

	db.session.add(dataset)
	db.session.commit()

	return jsonify({
		'message': 'Dataset uploaded successfully',
		'dataset_id': dataset.id
	}), 201


@app.route('/train', methods = ['POST'])
@jwt_required()
def train():
	user_id = get_jwt_identity()
	dataset_id = request.form.get('dataset_id')

	dataset = Dataset.query.filter_by(id = dataset_id, user_id = user_id).first()
	if not dataset:
		return jsonify({'error': 'Dataset not found'}), 404

	try:
		df = pd.read_csv(BytesIO(dataset.file_data))
	except pd.errors.EmptyDataError:
		return jsonify({"error": "Uploaded dataset is empty or invalid"}), 400
	except Exception as e:
		return jsonify({"error": str(e)}), 500

	target_column = request.form.get('target_column')
	model_type = request.form.get('model_type', 'random_forest')

	if target_column not in df.columns:
		return jsonify({'error': 'Target column not found in dataset'}), 400

	feature_columns = [col for col in df.columns if col != target_column]

	# Preprocess data
	for column in df.select_dtypes(include = ['object']).columns:
		if column != target_column:
			le = LabelEncoder()
			df[column] = le.fit_transform(df[column])

	X = df[feature_columns]
	y = df[target_column]

	if model_type == 'linear_regression':
		model = LinearRegression()
	elif model_type == 'logistic_regression':
		model = LogisticRegression(random_state = 42)
	elif model_type == 'svm':
		model = SVC(random_state = 42)
	elif model_type == 'decision_tree':
		if df[target_column].dtype == 'object':
			model = DecisionTreeClassifier(random_state = 42)
		else:
			model = DecisionTreeRegressor(random_state = 42)
	elif model_type == 'random_forest':
		if df[target_column].dtype == 'object':
			model = RandomForestClassifier(n_estimators = 100, random_state = 42)
		else:
			model = RandomForestRegressor(n_estimators = 100, random_state = 42)
	else:
		return jsonify({'error': 'Invalid model type'}), 400

	model.fit(X, y)

	model_binary = pickle.dumps(model)
	config = {
		'feature_columns': feature_columns,
		'target_column': target_column,
		'preprocessing': {
			'label_encoders': {
				col: list(set(df[col]))
				for col in df.select_dtypes(include = ['object']).columns
				if col != target_column
			}
		}
	}

	ml_model = MLModel(
		user_id = user_id,
		dataset_id = dataset_id,
		name = request.form.get('name', 'Unnamed Model'),
		description = request.form.get('description'),
		model_type = model_type,
		feature_columns = feature_columns,
		target_column = target_column,
		model_data = model_binary,
		config_data = config
	)

	db.session.add(ml_model)
	db.session.commit()

	return jsonify({
		'message': 'Model trained successfully',
		'model_id': ml_model.id
	})


@app.route('/predict/<int:model_id>', methods = ['POST'])
@jwt_required()
def predict(model_id):
	user_id = get_jwt_identity()
	ml_model = MLModel.query.filter_by(id = model_id, user_id = user_id).first()
	if not ml_model:
		return jsonify({'error': 'Model not found'}), 404

	try:
		data = request.json
		if isinstance(data, list):
			df = pd.DataFrame(data)
		else:
			df = pd.DataFrame([data])

		model = pickle.loads(ml_model.model_data)
		config = ml_model.config_data

		missing_columns = set(config['feature_columns']) - set(df.columns)
		if missing_columns:
			return jsonify({'error': f'Missing features: {missing_columns}'}), 400

		for column, unique_values in config['preprocessing']['label_encoders'].items():
			if column in df.columns:
				df[column] = df[column].map({val: idx for idx, val in enumerate(unique_values)})
				if df[column].isnull().any():
					return jsonify({'error': f'Invalid categorical value in column {column}'}), 400

		predictions = model.predict(df[config['feature_columns']]).tolist()

		confidence_score = None
		if hasattr(model, 'predict_proba'):
			confidence_score = model.predict_proba(df[config['feature_columns']])[0].max()

		prediction = Prediction(
			model_id = model_id,
			input_data = data,
			prediction_result = predictions,
			confidence_score = confidence_score
		)
		db.session.add(prediction)
		db.session.commit()

		return jsonify({
			'predictions': predictions,
			'confidence_score': confidence_score
		})

	except KeyError as ke:
		return jsonify({'error': f'Key error: {str(ke)}'}), 400
	except ValueError as ve:
		return jsonify({'error': f'Value error: {str(ve)}'}), 400
	except Exception as e:
		return jsonify({'error': f'An unexpected error occurred: {str(e)}'}), 500


@app.route('/models', methods = ['GET'])
@jwt_required()
def list_models():
	user_id = get_jwt_identity()
	models = MLModel.query.filter_by(user_id = user_id).all()

	return jsonify([{
		'id': model.id,
		'name': model.name,
		'description': model.description,
		'model_type': model.model_type,
		'feature_columns': model.feature_columns,
		'target_column': model.target_column,
		'created_at': model.created_at.isoformat(),
		'dataset_id': model.dataset_id
	} for model in models])


@app.route('/datasets', methods = ['GET'])
@jwt_required()
def list_datasets():
	user_id = get_jwt_identity()
	datasets = Dataset.query.filter_by(user_id = user_id).all()

	return jsonify([{
		'id': dataset.id,
		'name': dataset.name,
		'description': dataset.description,
		'columns': json.loads(dataset.columns),
		'row_count': dataset.row_count,
		'created_at': dataset.created_at.isoformat()
	} for dataset in datasets])


@app.route('/predictions/<int:model_id>', methods = ['GET'])
@jwt_required()
def get_predictions(model_id):
	user_id = get_jwt_identity()

	model = MLModel.query.filter_by(id = model_id, user_id = user_id).first()
	if not model:
		return jsonify({'error': 'Model not found'}), 404

	page = request.args.get('page', 1, type = int)
	per_page = request.args.get('per_page', 10, type = int)

	predictions = Prediction.query.filter_by(model_id = model_id) \
		.order_by(Prediction.created_at.desc()) \
		.paginate(page = page, per_page = per_page)

	return jsonify({
		'predictions': [{
			'id': pred.id,
			'input_data': pred.input_data,
			'prediction_result': pred.prediction_result,
			'confidence_score': pred.confidence_score,
			'created_at': pred.created_at.isoformat()
		} for pred in predictions.items],
		'total': predictions.total,
		'pages': predictions.pages,
		'current_page': predictions.page
	})


if __name__ == "__main__":
	app.run(debug = Config.DEBUG)
