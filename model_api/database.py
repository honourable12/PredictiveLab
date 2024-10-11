from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from sqlalchemy.dialects.postgresql import JSON, BYTEA

db = SQLAlchemy()


class User(db.Model):
	__tablename__ = 'users'

	id = db.Column(db.Integer, primary_key = True)
	username = db.Column(db.String(80), unique = True, nullable = False, index = True)
	password = db.Column(db.String(255), nullable = False)
	email = db.Column(db.String(120), unique = True, nullable = True)
	created_at = db.Column(db.DateTime, default = datetime.utcnow)
	last_login = db.Column(db.DateTime)
	is_active = db.Column(db.Boolean, default = True)

	models = db.relationship('MLModel', backref = 'user', lazy = True, cascade = 'all, delete-orphan')
	datasets = db.relationship('Dataset', backref = 'user', lazy = True, cascade = 'all, delete-orphan')


class MLModel(db.Model):
	__tablename__ = 'ml_models'

	id = db.Column(db.Integer, primary_key = True)
	user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete = 'CASCADE'), nullable = False)
	name = db.Column(db.String(100), nullable = False)
	description = db.Column(db.Text)
	model_type = db.Column(db.String(50), nullable = False)
	feature_columns = db.Column(JSON, nullable = False)
	target_column = db.Column(db.String(50), nullable = False)
	model_data = db.Column(BYTEA, nullable = False)
	config_data = db.Column(JSON, nullable = False)
	metrics = db.Column(JSON)
	created_at = db.Column(db.DateTime, default = datetime.utcnow)
	updated_at = db.Column(db.DateTime, default = datetime.utcnow, onupdate = datetime.utcnow)
	is_active = db.Column(db.Boolean, default = True)

	dataset_id = db.Column(db.Integer, db.ForeignKey('datasets.id'))
	predictions = db.relationship('Prediction', backref = 'model', lazy = True, cascade = 'all, delete-orphan')


class Dataset(db.Model):
	__tablename__ = 'datasets'

	id = db.Column(db.Integer, primary_key = True)
	user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete = 'CASCADE'), nullable = False)
	name = db.Column(db.String(100), nullable = False)
	description = db.Column(db.Text)
	file_data = db.Column(BYTEA)
	columns = db.Column(JSON, nullable = False)
	row_count = db.Column(db.Integer)
	created_at = db.Column(db.DateTime, default = datetime.utcnow)
	updated_at = db.Column(db.DateTime, default = datetime.utcnow, onupdate = datetime.utcnow)

	models = db.relationship('MLModel', backref = 'dataset', lazy = True)


class Prediction(db.Model):
	__tablename__ = 'predictions'

	id = db.Column(db.Integer, primary_key = True)
	model_id = db.Column(db.Integer, db.ForeignKey('ml_models.id', ondelete = 'CASCADE'), nullable = False)
	input_data = db.Column(JSON, nullable = False)
	prediction_result = db.Column(JSON, nullable = False)
	confidence_score = db.Column(db.Float)
	created_at = db.Column(db.DateTime, default = datetime.utcnow)

	__table_args__ = (
		db.Index('idx_model_created', model_id, created_at),
	)


def init_db(app):
	db.init_app(app)
	with app.app_context():
		db.create_all()


if __name__ == "__main__":
	from flask import Flask
	from config import Config

	app = Flask(__name__)
	app.config.from_object(Config)

	init_db(app)
	print("Database initialized successfully!")