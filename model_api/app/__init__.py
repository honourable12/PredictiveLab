from flask import Flask


def create_app():
	app = Flask(__name__)

	from app.model import bp as model_blueprint
	app.register_blueprint(model_blueprint)

	return app