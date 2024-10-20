package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/session"
	"github.com/gofiber/template/html/v2"
	"github.com/joho/godotenv"
)

type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type LoginResponse struct {
	AccessToken string `json:"access_token"`
	TokenType   string `json:"token_type"`
}

type Dataset struct {
	ID          int      `json:"id"`
	Name        string   `json:"name"`
	Description string   `json:"description"`
	Columns     []string `json:"columns"`
	RowCount    int      `json:"row_count"`
	CreatedAt   string   `json:"created_at"`
}

type Model struct {
	ID             int      `json:"id"`
	Name           string   `json:"name"`
	Description    string   `json:"description"`
	ModelType      string   `json:"model_type"`
	FeatureColumns []string `json:"feature_columns"`
	TargetColumn   string   `json:"target_column"`
	CreatedAt      string   `json:"created_at"`
	DatasetID      int      `json:"dataset_id"`
}

type Prediction struct {
	ID               int                    `json:"id"`
	InputData        map[string]interface{} `json:"input_data"`
	PredictionResult []interface{}          `json:"prediction_result"`
	ConfidenceScore  float64                `json:"confidence_score"`
	CreatedAt        string                 `json:"created_at"`
}

type PredictionResponse struct {
	Predictions []Prediction `json:"predictions"`
	Total       int          `json:"total"`
	Pages       int          `json:"pages"`
	CurrentPage int          `json:"current_page"`
}

var store = session.New()
var apiURL string

func init() {
	if err := godotenv.Load(); err != nil {
		fmt.Println("Error loading .env file")
	}
	apiURL = os.Getenv("API_URL")
}

func main() {
	engine := html.New("./views", ".html")
	app := fiber.New(fiber.Config{
		Prefork: true,
		Views:   engine,
	})

	app.Static("/static", "./static")

	// Middleware to check authentication
	app.Use(func(c *fiber.Ctx) error {
		if c.Path() == "/login" || c.Path() == "/register" {
			return c.Next()
		}

		sess, err := store.Get(c)
		if err != nil {
			return c.Redirect("/login")
		}

		token := sess.Get("token")
		if token == nil {
			return c.Redirect("/login")
		}

		return c.Next()
	})

	setupRoutes(app)

	app.Listen(":3000")
}

func setupRoutes(app *fiber.App) {
	app.Get("/", handleHome)
	app.Get("/login", handleLoginPage)
	app.Post("/login", handleLogin)
	app.Get("/register", handleRegisterPage)
	app.Post("/register", handleRegister)
	app.Get("/logout", handleLogout)

	app.Get("/datasets", handleDatasets)
	app.Get("/upload", handleUploadPage)
	app.Post("/upload", handleUpload)

	app.Get("/models", handleModels)
	app.Get("/train", handleTrainPage)
	app.Post("/train", handleTrain)

	app.Get("/predict/:modelId", handlePredictPage)
	app.Post("/predict/:modelId", handlePredict)
	app.Get("/predictions/:modelId", handlePredictions)
}

func handleHome(c *fiber.Ctx) error {
	if err := c.Render("home", fiber.Map{"Title": "ML Platform"}); err != nil {
		return c.Status(fiber.StatusInternalServerError).SendString("Error rendering home page")
	}
	return nil
}

func handleLoginPage(c *fiber.Ctx) error {
	return c.Render("login", fiber.Map{
		"Title": "Login",
	})
}

func handleLogin(c *fiber.Ctx) error {
	username := c.FormValue("username")
	password := c.FormValue("password")

	loginReq := LoginRequest{
		Username: username,
		Password: password,
	}

	jsonData, _ := json.Marshal(loginReq)
	resp, err := http.Post(apiURL+"/token", "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return c.Render("login", fiber.Map{
			"Error": "Failed to connect to server",
		})
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return c.Render("login", fiber.Map{
			"Error": "Invalid credentials",
		})
	}

	var loginResp LoginResponse
	if err := json.NewDecoder(resp.Body).Decode(&loginResp); err != nil {
		return c.Render("login", fiber.Map{
			"Error": "Failed to parse response",
		})
	}

	sess, _ := store.Get(c)
	sess.Set("token", loginResp.AccessToken)
	sess.Save()

	return c.Redirect("/")
}

func handleRegisterPage(c *fiber.Ctx) error {
	return c.Render("register", fiber.Map{
		"Title": "Register",
	})
}

func handleRegister(c *fiber.Ctx) error {
	username := c.FormValue("username")
	password := c.FormValue("password")
	email := c.FormValue("email")

	formData := map[string]string{
		"username": username,
		"password": password,
		"email":    email,
	}

	jsonData, _ := json.Marshal(formData)
	resp, err := http.Post(apiURL+"/register", "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return c.Render("register", fiber.Map{
			"Error": "Failed to connect to server",
		})
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return c.Render("register", fiber.Map{
			"Error": "Registration failed",
		})
	}

	return c.Redirect("/login")
}

func handleLogout(c *fiber.Ctx) error {
	sess, _ := store.Get(c)
	sess.Delete("token")
	sess.Save()
	return c.Redirect("/login")
}

func handleDatasets(c *fiber.Ctx) error {
	sess, _ := store.Get(c)
	token := sess.Get("token").(string)

	req, _ := http.NewRequest("GET", apiURL+"/datasets", nil)
	req.Header.Set("Authorization", "Bearer "+token)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return c.Render("datasets", fiber.Map{
			"Error": "Failed to fetch datasets",
		})
	}
	defer resp.Body.Close()

	var datasets []Dataset
	if err := json.NewDecoder(resp.Body).Decode(&datasets); err != nil {
		return c.Render("datasets", fiber.Map{
			"Error": "Failed to parse datasets",
		})
	}

	return c.Render("datasets", fiber.Map{
		"Title":    "Datasets",
		"Datasets": datasets,
	})
}

func handleUploadPage(c *fiber.Ctx) error {
	return c.Render("upload", fiber.Map{
		"Title": "Upload Dataset",
	})
}

func handleUpload(c *fiber.Ctx) error {
	sess, _ := store.Get(c)
	token := sess.Get("token").(string)

	file, err := c.FormFile("file")
	if err != nil {
		return c.Render("upload", fiber.Map{
			"Error": "Failed to process file",
		})
	}

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, _ := writer.CreateFormFile("file", file.Filename)

	fileContent, _ := file.Open()
	io.Copy(part, fileContent)

	writer.WriteField("name", c.FormValue("name"))
	writer.WriteField("description", c.FormValue("description"))
	writer.Close()

	req, _ := http.NewRequest("POST", apiURL+"/upload", body)
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", writer.FormDataContentType())

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return c.Render("upload", fiber.Map{
			"Error": "Failed to upload dataset",
		})
	}
	defer resp.Body.Close()

	return c.Redirect("/datasets")
}

func handleModels(c *fiber.Ctx) error {
	sess, _ := store.Get(c)
	token := sess.Get("token").(string)

	req, _ := http.NewRequest("GET", apiURL+"/models", nil)
	req.Header.Set("Authorization", "Bearer "+token)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return c.Render("models", fiber.Map{
			"Error": "Failed to fetch models",
		})
	}
	defer resp.Body.Close()

	var models []Model
	if err := json.NewDecoder(resp.Body).Decode(&models); err != nil {
		return c.Render("models", fiber.Map{
			"Error": "Failed to parse models",
		})
	}

	return c.Render("models", fiber.Map{
		"Title":  "Models",
		"Models": models,
	})
}

func handleTrainPage(c *fiber.Ctx) error {
	sess, _ := store.Get(c)
	token := sess.Get("token").(string)

	req, _ := http.NewRequest("GET", apiURL+"/datasets", nil)
	req.Header.Set("Authorization", "Bearer "+token)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return c.Render("train", fiber.Map{
			"Error": "Failed to fetch datasets",
		})
	}
	defer resp.Body.Close()

	var datasets []Dataset
	if err := json.NewDecoder(resp.Body).Decode(&datasets); err != nil {
		return c.Render("train", fiber.Map{
			"Error": "Failed to parse datasets",
		})
	}

	return c.Render("train", fiber.Map{
		"Title":    "Train Model",
		"Datasets": datasets,
	})
}

func handleTrain(c *fiber.Ctx) error {
	sess, _ := store.Get(c)
	token := sess.Get("token").(string)

	formData := map[string]string{
		"dataset_id":      c.FormValue("dataset_id"),
		"model_type":      c.FormValue("model_type"),
		"target_column":   c.FormValue("target_column"),
		"feature_columns": c.FormValue("feature_columns"),
	}

	jsonData, _ := json.Marshal(formData)
	req, _ := http.NewRequest("POST", apiURL+"/train", bytes.NewBuffer(jsonData))
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return c.Render("train", fiber.Map{
			"Error": "Failed to train model",
		})
	}
	defer resp.Body.Close()

	return c.Redirect("/models")
}

func handlePredictPage(c *fiber.Ctx) error {
	return c.Render("predict", fiber.Map{
		"Title": "Make Prediction",
	})
}

func handlePredict(c *fiber.Ctx) error {
	sess, _ := store.Get(c)
	token := sess.Get("token").(string)
	modelID := c.Params("modelId")

	formData := map[string]interface{}{}
	if err := c.BodyParser(&formData); err != nil {
		return c.Render("predict", fiber.Map{
			"Error": "Failed to process form data",
		})
	}

	jsonData, _ := json.Marshal(formData)
	req, _ := http.NewRequest("POST", apiURL+"/predict/"+modelID, bytes.NewBuffer(jsonData))
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return c.Render("predict", fiber.Map{
			"Error": "Failed to make prediction",
		})
	}
	defer resp.Body.Close()

	var predictionResp PredictionResponse
	if err := json.NewDecoder(resp.Body).Decode(&predictionResp); err != nil {
		return c.Render("predict", fiber.Map{
			"Error": "Failed to parse prediction result",
		})
	}

	return c.Render("predict", fiber.Map{
		"Title":       "Prediction Results",
		"Predictions": predictionResp.Predictions,
	})
}

func handlePredictions(c *fiber.Ctx) error {
	sess, _ := store.Get(c)
	token := sess.Get("token").(string)
	modelID := c.Params("modelId")

	req, _ := http.NewRequest("GET", apiURL+"/predictions/"+modelID, nil)
	req.Header.Set("Authorization", "Bearer "+token)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return c.Render("predictions", fiber.Map{
			"Error": "Failed to fetch predictions",
		})
	}
	defer resp.Body.Close()

	var predictionResp PredictionResponse
	if err := json.NewDecoder(resp.Body).Decode(&predictionResp); err != nil {
		return c.Render("predictions", fiber.Map{
			"Error": "Failed to parse predictions",
		})
	}

	return c.Render("predictions", fiber.Map{
		"Title":       "Prediction History",
		"Predictions": predictionResp.Predictions,
	})
}
