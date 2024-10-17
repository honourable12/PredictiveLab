package main

import (
	"bytes"
	"encoding/json"

	//"fmt"
	"io"
	"log"
	"mime/multipart"
	"net/http"

	//"os"
	//"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/session"
	"github.com/gofiber/template/html/v2"
)

const apiBaseURL = "http://localhost:5000"

var store *session.Store

type User struct {
	Username string `json:"username"`
	Password string `json:"password"`
	Email    string `json:"email"`
}

type LoginResponse struct {
	AccessToken string `json:"access_token"`
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

func main() {
	// Initialize session store
	store = session.New()

	// Initialize template engine
	engine := html.New("./views", ".html")
	engine.Reload(true) // Enable this line for development

	// Create and configure Fiber app
	app := fiber.New(fiber.Config{
		Views:       engine,
		ViewsLayout: "layouts/main",
	})

	// Middleware
	app.Use(logger.New())

	// Routes
	app.Get("/", handleIndex)
	app.Get("/register", handleRegisterForm)
	app.Post("/register", handleRegister)
	app.Get("/login", handleLoginForm)
	app.Post("/login", handleLogin)
	app.Get("/logout", handleLogout)
	app.Get("/dashboard", requireAuth(handleDashboard))
	app.Get("/upload", requireAuth(handleUploadForm))
	app.Post("/upload", requireAuth(handleUpload))
	app.Get("/train", requireAuth(handleTrainForm))
	app.Post("/train", requireAuth(handleTrain))
	app.Get("/predict/:modelID", requireAuth(handlePredictForm))
	app.Post("/predict/:modelID", requireAuth(handlePredict))

	// Start server
	log.Fatal(app.Listen(":3000"))
}

func handleIndex(c *fiber.Ctx) error {
	return c.Render("index", fiber.Map{
		"Title": "Welcome",
	})
}

func handleRegisterForm(c *fiber.Ctx) error {
	return c.Render("register", fiber.Map{
		"Title": "Register",
	})
}

func handleRegister(c *fiber.Ctx) error {
	username := c.FormValue("username")
	password := c.FormValue("password")
	email := c.FormValue("email")

	user := User{Username: username, Password: password, Email: email}
	jsonData, err := json.Marshal(user)
	if err != nil {
		return renderError(c, "register", "Error processing registration data")
	}

	resp, err := http.Post(apiBaseURL+"/register", "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return renderError(c, "register", "Error connecting to API")
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated {
		return renderError(c, "register", "Registration failed")
	}

	return c.Redirect("/login")
}

func handleLoginForm(c *fiber.Ctx) error {
	return c.Render("login", fiber.Map{
		"Title": "Login",
	})
}

func handleLogin(c *fiber.Ctx) error {
	username := c.FormValue("username")
	password := c.FormValue("password")

	user := User{Username: username, Password: password}
	jsonData, err := json.Marshal(user)
	if err != nil {
		return renderError(c, "login", "Error processing login data")
	}

	resp, err := http.Post(apiBaseURL+"/login", "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return renderError(c, "login", "Error connecting to API")
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return renderError(c, "login", "Invalid credentials")
	}

	var loginResp LoginResponse
	if err := json.NewDecoder(resp.Body).Decode(&loginResp); err != nil {
		return renderError(c, "login", "Error processing API response")
	}

	sess, err := store.Get(c)
	if err != nil {
		return renderError(c, "login", "Error managing session")
	}
	sess.Set("token", loginResp.AccessToken)
	if err := sess.Save(); err != nil {
		return renderError(c, "login", "Error saving session")
	}

	return c.Redirect("/dashboard")
}

func handleLogout(c *fiber.Ctx) error {
	sess, err := store.Get(c)
	if err != nil {
		return c.Redirect("/")
	}
	sess.Delete("token")
	if err := sess.Save(); err != nil {
		return c.Redirect("/")
	}
	return c.Redirect("/")
}

func handleDashboard(c *fiber.Ctx) error {
	token := c.Locals("token").(string)

	datasets, err := fetchDatasets(token)
	if err != nil {
		return renderError(c, "dashboard", "Error fetching datasets")
	}

	models, err := fetchModels(token)
	if err != nil {
		return renderError(c, "dashboard", "Error fetching models")
	}

	return c.Render("dashboard", fiber.Map{
		"Title":    "Dashboard",
		"Datasets": datasets,
		"Models":   models,
	})
}

func handleUploadForm(c *fiber.Ctx) error {
	return c.Render("upload", fiber.Map{
		"Title": "Upload Dataset",
	})
}

func handleUpload(c *fiber.Ctx) error {
	token := c.Locals("token").(string)

	file, err := c.FormFile("file")
	if err != nil {
		return renderError(c, "upload", "Error uploading file")
	}

	src, err := file.Open()
	if err != nil {
		return renderError(c, "upload", "Error opening uploaded file")
	}
	defer src.Close()

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, err := writer.CreateFormFile("file", file.Filename)
	if err != nil {
		return renderError(c, "upload", "Error creating form file")
	}
	_, err = io.Copy(part, src)
	if err != nil {
		return renderError(c, "upload", "Error copying file content")
	}
	writer.Close()

	req, err := http.NewRequest("POST", apiBaseURL+"/dataset", body)
	if err != nil {
		return renderError(c, "upload", "Error creating request")
	}
	req.Header.Set("Content-Type", writer.FormDataContentType())
	req.Header.Set("Authorization", "Bearer "+token)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return renderError(c, "upload", "Error connecting to API")
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated {
		return renderError(c, "upload", "Upload failed")
	}

	return c.Redirect("/dashboard")
}

func handleTrainForm(c *fiber.Ctx) error {
	token := c.Locals("token").(string)

	datasets, err := fetchDatasets(token)
	if err != nil {
		return renderError(c, "train", "Error fetching datasets")
	}

	return c.Render("train", fiber.Map{
		"Title":    "Train Model",
		"Datasets": datasets,
	})
}

func handleTrain(c *fiber.Ctx) error {
	token := c.Locals("token").(string)

	datasetID := c.FormValue("dataset_id")
	targetColumn := c.FormValue("target_column")
	modelType := c.FormValue("model_type")

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	writer.WriteField("dataset_id", datasetID)
	writer.WriteField("target_column", targetColumn)
	writer.WriteField("model_type", modelType)
	writer.Close()

	req, err := http.NewRequest("POST", apiBaseURL+"/train", body)
	if err != nil {
		return renderError(c, "train", "Error creating request")
	}
	req.Header.Set("Content-Type", writer.FormDataContentType())
	req.Header.Set("Authorization", "Bearer "+token)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return renderError(c, "train", "Error connecting to API")
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return renderError(c, "train", "Training failed")
	}

	return c.Redirect("/dashboard")
}

func handlePredictForm(c *fiber.Ctx) error {
	modelID := c.Params("modelID")
	return c.Render("predict", fiber.Map{
		"Title":   "Make Prediction",
		"ModelID": modelID,
	})
}

func handlePredict(c *fiber.Ctx) error {
	token := c.Locals("token").(string)
	modelID := c.Params("modelID")
	inputData := c.FormValue("input_data")

	jsonData := []byte(inputData)

	req, err := http.NewRequest("POST", apiBaseURL+"/predict/"+modelID, bytes.NewBuffer(jsonData))
	if err != nil {
		return renderError(c, "predict", "Error creating request")
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return renderError(c, "predict", "Error connecting to API")
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return renderError(c, "predict", "Prediction failed")
	}

	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return renderError(c, "predict", "Error processing API response")
	}

	return c.Render("predict", fiber.Map{
		"Title":      "Prediction Result",
		"ModelID":    modelID,
		"Prediction": result["predictions"],
		"Confidence": result["confidence_score"],
	})
}

func fetchDatasets(token string) ([]Dataset, error) {
	req, err := http.NewRequest("GET", apiBaseURL+"/datasets", nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+token)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var datasets []Dataset
	if err := json.NewDecoder(resp.Body).Decode(&datasets); err != nil {
		return nil, err
	}

	return datasets, nil
}

func fetchModels(token string) ([]Model, error) {
	req, err := http.NewRequest("GET", apiBaseURL+"/models", nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+token)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var models []Model
	if err := json.NewDecoder(resp.Body).Decode(&models); err != nil {
		return nil, err
	}

	return models, nil
}

func requireAuth(handler fiber.Handler) fiber.Handler {
	return func(c *fiber.Ctx) error {
		sess, err := store.Get(c)
		if err != nil {
			return c.Redirect("/login")
		}

		token := sess.Get("token")
		if token == nil {
			return c.Redirect("/login")
		}

		c.Locals("token", token)
		return handler(c)
	}
}

func renderError(c *fiber.Ctx, view string, message string) error {
	return c.Render(view, fiber.Map{
		"Title": "Error",
		"Error": message,
	})
}
