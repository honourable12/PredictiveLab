from flask import Flask, request, jsonify 
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.svm import SVC
from sklearn.tree import DecisionTreeClassifier, DecisionTreeRegressor
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
import pickle
import os
import json
import numpy as np

app = Flask(__name__)

MODEL_PATH = 'model.pkl'
MODEL_CONFIG_PATH = 'model_config.json'
model = None
label_encoders = {}
target_encoder = None
feature_columns = None
target_column = None
scaler = None

def load_model_if_exists():
    global model, label_encoders, target_encoder, feature_columns, target_column, scaler
    if os.path.exists(MODEL_PATH) and os.path.exists(MODEL_CONFIG_PATH):
        with open(MODEL_PATH, 'rb') as f:
            model = pickle.load(f)
        with open(MODEL_CONFIG_PATH, 'r') as f:
            config = json.load(f)
            label_encoders = {col: LabelEncoder().fit(config['encoders'][col]) 
                            for col in config['encoders']}
            if config.get('target_encoder'):
                target_encoder = LabelEncoder().fit(config['target_encoder'])
            else:
                target_encoder = None
            feature_columns = config['feature_columns']
            target_column = config['target_column']
            if 'scaler' in config:
                scaler = StandardScaler()
                scaler.mean_ = config['scaler']['mean']
                scaler.scale_ = config['scaler']['scale']
            else:
                scaler = None
        return True
    return False

def preprocess_data(df, training=False):
    global label_encoders, target_encoder, feature_columns, target_column, scaler
    
    if training:
        label_encoders = {}
        for column in df.select_dtypes(include=['object']).columns:
            if column != target_column:
                label_encoders[column] = LabelEncoder()
                df[column] = label_encoders[column].fit_transform(df[column])

        if df[target_column].dtype == 'object':
            target_encoder = LabelEncoder()
            df[target_column] = target_encoder.fit_transform(df[target_column])
        else:
            target_encoder = None

        scaler = StandardScaler()
        df[feature_columns] = scaler.fit_transform(df[feature_columns])
        
        config = {
            'encoders': {col: encoder.classes_.tolist() 
                        for col, encoder in label_encoders.items()},
            'target_encoder': target_encoder.classes_.tolist() if target_encoder else None,
            'feature_columns': feature_columns,
            'target_column': target_column,
            'scaler': {
                'mean': scaler.mean_.tolist(),
                'scale': scaler.scale_.tolist()
            }
        }
        with open(MODEL_CONFIG_PATH, 'w') as f:
            json.dump(config, f)
    else:
        for column, encoder in label_encoders.items():
            if column in df.columns:
                df[column] = df[column].map(dict(zip(encoder.classes_, 
                                                    range(len(encoder.classes_)))))
        if scaler:
            df[feature_columns] = scaler.transform(df[feature_columns])
    
    return df

@app.route('/preview', methods=['POST'])
def preview_data():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    if not file.filename.endswith('.csv'):
        return jsonify({'error': 'Please upload a CSV file'}), 400

    df = pd.read_csv(file)

    num_rows = int(request.form.get('num_rows', 5))

    preview_data = df.head(num_rows).to_dict(orient='records')
    
    return jsonify({
        'preview': preview_data,
        'total_rows': len(df),
        'total_columns': len(df.columns),
        'column_names': df.columns.tolist()
    })

@app.route('/train', methods=['POST'])
def train():
    global model, feature_columns, target_column
    
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    if not file.filename.endswith('.csv'):
        return jsonify({'error': 'Please upload a CSV file'}), 400

    params = request.form.to_dict()
    target_column = params.get('target_column')
    model_type = params.get('model_type', 'random_forest')
    drop_columns = params.get('drop_columns', '')
    
    if not target_column:
        return jsonify({'error': 'Target column not specified'}), 400

    df = pd.read_csv(file)

    if drop_columns:
        columns_to_drop = [col.strip() for col in drop_columns.split(',')]
        df = df.drop(columns=columns_to_drop, errors='ignore')

    feature_columns = [col for col in df.columns if col != target_column]

    df = preprocess_data(df, training=True)

    X = df[feature_columns]
    y = df[target_column]

    if model_type == 'linear_regression':
        model = LinearRegression()
    elif model_type == 'logistic_regression':
        model = LogisticRegression(random_state=42)
    elif model_type == 'svm':
        model = SVC(random_state=42)
    elif model_type == 'decision_tree':
        if df[target_column].dtype == 'object':
            model = DecisionTreeClassifier(random_state=42)
        else:
            model = DecisionTreeRegressor(random_state=42)
    elif model_type == 'random_forest':
        if df[target_column].dtype == 'object':
            model = RandomForestClassifier(n_estimators=100, random_state=42)
        else:
            model = RandomForestRegressor(n_estimators=100, random_state=42)
    else:
        return jsonify({'error': 'Invalid model type'}), 400

    model.fit(X, y)

    with open(MODEL_PATH, 'wb') as f:
        pickle.dump(model, f)
    
    return jsonify({
        'message': 'Model trained successfully',
        'model_type': model_type,
        'features': feature_columns,
        'target': target_column,
        'dropped_columns': columns_to_drop if drop_columns else []
    })

@app.route('/predict', methods=['POST'])
def predict():
    if not load_model_if_exists():
        return jsonify({'error': 'No trained model found'}), 400
    
    try:
        data = request.json
        if isinstance(data, list):
            df = pd.DataFrame(data)
        else:
            df = pd.DataFrame([data])

        missing_columns = set(feature_columns) - set(df.columns)
        if missing_columns:
            return jsonify({'error': f'Missing features: {missing_columns}'}), 400

        df = preprocess_data(df, training=False)

        predictions = model.predict(df[feature_columns])

        if target_encoder:
            predictions = target_encoder.inverse_transform(predictions)

        predictions = [str(pred) for pred in predictions]
        
        return jsonify({
            'predictions': predictions
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/model-info', methods=['GET'])
def model_info():
    if not load_model_if_exists():
        return jsonify({'error': 'No trained model found'}), 400
    
    return jsonify({
        'model_type': type(model).__name__,
        'feature_columns': feature_columns,
        'target_column': target_column,
        'categorical_features': list(label_encoders.keys()),
        'target_classes': [str(class_) for class_ in target_encoder.classes_] if target_encoder else None
    })

if __name__ == "__main__":
    load_model_if_exists()
    app.run(debug=False, port=5000)