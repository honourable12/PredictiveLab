import React from 'react';
import { Link } from 'react-router-dom';
import { Brain, Database, LineChart, Zap, Shield, Code } from 'lucide-react';

function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md fixed w-full z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <Brain className="h-8 w-8 text-indigo-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">ML Platform</span>
            </div>
            <div className="flex space-x-4">
              <Link
                to="/login"
                className="text-gray-700 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2 rounded-md text-sm font-medium"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-gray-900 tracking-tight">
              Machine Learning Made <span className="text-indigo-600">Simple</span>
            </h1>
            <p className="mt-6 max-w-2xl mx-auto text-lg sm:text-xl text-gray-500">
              Build, train, and deploy machine learning models without writing code. Perfect for data scientists and developers.
            </p>
            <div className="mt-8">
              <Link
                to="/register"
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Start Building Models
                <Zap className="ml-2 h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="p-6 border border-gray-100 rounded-lg shadow-sm hover:shadow-md transition-shadow">
              <Database className="h-8 w-8 text-indigo-600" />
              <h3 className="mt-4 text-xl font-semibold text-gray-900">Dataset Management</h3>
              <p className="mt-2 text-gray-600">
                Upload, clean, and transform your datasets with ease. Support for CSV files with automatic preprocessing.
              </p>
            </div>
            <div className="p-6 border border-gray-100 rounded-lg shadow-sm hover:shadow-md transition-shadow">
              <Brain className="h-8 w-8 text-indigo-600" />
              <h3 className="mt-4 text-xl font-semibold text-gray-900">Model Training</h3>
              <p className="mt-2 text-gray-600">
                Train models using popular algorithms like Random Forest, SVM, and more with just a few clicks.
              </p>
            </div>
            <div className="p-6 border border-gray-100 rounded-lg shadow-sm hover:shadow-md transition-shadow">
              <LineChart className="h-8 w-8 text-indigo-600" />
              <h3 className="mt-4 text-xl font-semibold text-gray-900">Predictions & Analytics</h3>
              <p className="mt-2 text-gray-600">
                Make predictions and visualize results with interactive charts and detailed analytics.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Trust Section */}
      <div className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Why Choose Us?</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="flex items-start">
              <Shield className="h-6 w-6 text-indigo-600 mt-1" />
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">Secure by Design</h3>
                <p className="mt-2 text-gray-600">
                  Your data is encrypted and protected. We follow industry best practices for security and privacy.
                </p>
              </div>
            </div>
            <div className="flex items-start">
              <Code className="h-6 w-6 text-indigo-600 mt-1" />
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">Developer Friendly</h3>
                <p className="mt-2 text-gray-600">
                  Export models, access via API, and integrate with your existing workflows seamlessly.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-indigo-600">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
              Ready to get started?
            </h2>
            <p className="mt-4 text-lg text-indigo-100">
              Create your account now and start building machine learning models in minutes.
            </p>
            <div className="mt-8">
              <Link
                to="/register"
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-indigo-600 bg-white hover:bg-indigo-50"
              >
                Sign up for free
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <Brain className="h-6 w-6 text-indigo-600" />
              <span className="ml-2 text-lg font-semibold text-gray-900">ML Platform</span>
            </div>
            <p className="text-gray-500 text-sm">
              © 2024 ML Platform. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Landing;