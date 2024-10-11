from datetime import timedelta
import os
from dotenv import load_dotenv

load_dotenv()


class Config:
	# Database
	SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL')
	SQLALCHEMY_TRACK_MODIFICATIONS = False

	# JWT
	JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY')
	JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours = 1)

	# Flask
	DEBUG = os.getenv('FLASK_ENV') == 'development'