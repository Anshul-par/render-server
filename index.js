import express from "express";
import cors from "cors";
import axios from "axios";

const app = express();

app.use(
  cors({
    origin: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

app.get("/", (_, res) => {
  res.status(200).json({
    message: "Welcome to the API!",
    status: 200,
  });
});

app.get("/random", (_, res) => {
  const randomNumber = Math.floor(Math.random() * 100) + 1;

  if (randomNumber % 2 === 0) {
    res.status(200).json({
      message: "Even number generated!",
      randomNumber,
      status: 200,
    });
  } else {
    res.status(500).json({
      message: "Odd number generated!",
      randomNumber,
      status: 500,
    });
  }
});

app.post("/check", async (req, res) => {
  const { body, header, method = "GET", url, timeout = 60, urlId } = req.body;
  try {
    const result = await performUrlHealthCheck({
      body,
      header,
      method,
      url,
      timeout,
      urlId,
    });

    res.status(200).json({
      message: "Check endpoint hit!",
      data: result,
      status: 200,
    });
  } catch (error) {
    console.error("Error in /check endpoint:", error);
    res.status(500).json({
      message: "Internal server error",
      status: 500,
    });
  }
});

export async function performUrlHealthCheck(task) {
  const startTime = Date.now();

  try {
    // Prepare axios request configuration
    const requestConfig = {
      method: task.method,
      url: task.url,
      headers: task.headers || {},
      data: task.body || {},
      timeout: task.timeout * 1000, // convert to milliseconds
      validateStatus: () => true,
    };

    // Perform the request
    const response = await axios(requestConfig);

    // Calculate response time
    const responseTime = Date.now() - startTime;

    // Prepare health check result
    const result = {
      taskId: task.urlId,
      url_id: task.urlId,
      url: task.url,
      timestamp: Date.now(),
      responseTime,
      statusCode: response.status,
      isSuccess: response.status >= 200 && response.status < 500,
      responseSize: response.headers["content-length"] || 0,
      contentType: response.headers["content-type"],
      headers: Object.fromEntries(
        Object.entries(response.headers).map(([key, value]) => [
          key,
          String(value),
        ])
      ),
      requestMethod: task.method,
    };

    return result;
  } catch (error) {
    const responseTime = Date.now() - startTime;

    if (error.isAxiosError) {
      const axiosError = error;

      // Handle other errors
      return {
        taskId: task.urlId,
        url_id: task.urlId,
        url: task.url,
        timestamp: Date.now(),
        responseTime,
        statusCode: axiosError.response?.status || 500,
        isSuccess: false,
        errorMessage: axiosError.message,
        responseSize: 0,
        requestMethod: task.method,
      };
    }

    // If not an AxiosError, return generic result
    return {
      taskId: task.urlId,
      url_id: task.urlId,
      url: task.url,
      timestamp: Date.now(),
      responseTime,
      statusCode: 500,
      isSuccess: false,
      errorMessage: "Unknown error",
      responseSize: 0,
      requestMethod: task.method,
    };
  }
}

app.listen(5656, () => {
  console.log("Server is running on port 5656");
});
