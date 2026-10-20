
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      success: false,
      message: "Method not allowed."
    });
  }

  const scriptUrl = process.env.APPS_SCRIPT_URL?.trim();

  if (!scriptUrl) {
    return res.status(500).json({
      success: false,
      message: "Backend URL is not configured in Vercel. Check APPS_SCRIPT_URL."
    });
  }

  if (!scriptUrl.startsWith("https://script.google.com/macros/s/") ||
      !scriptUrl.endsWith("/exec")) {
    return res.status(500).json({
      success: false,
      message: "APPS_SCRIPT_URL must be the deployed Google Apps Script URL ending in /exec."
    });
  }

  try {
    let body = req.body || {};

    // Handle requests whose body arrives as a JSON string.
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        return res.status(400).json({
          success: false,
          message: "Invalid request body. Expected JSON."
        });
      }
    }

    const token = body.token;
    const staffName = body.staffName;

    if (
      typeof token !== "string" || !token.trim() ||
      typeof staffName !== "string" || !staffName.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Student token and staff name are required."
      });
    }

    const response = await fetch(scriptUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify({
        token: token.trim(),
        staffName: staffName.trim()
      }),
      redirect: "follow"
    });

    const responseText = await response.text();

    let result;

    try {
      result = JSON.parse(responseText);
    } catch {
      const contentType =
        response.headers.get("content-type") || "unknown";

      // Return limited diagnostics without exposing the student's token.
      return res.status(502).json({
        success: false,
        message: "Google Apps Script returned a non-JSON response.",
        diagnostic: {
          httpStatus: response.status,
          contentType,
          responsePreview: responseText.slice(0, 300)
        }
      });
    }

    if (!response.ok) {
      return res.status(502).json({
        success: false,
        message: "Google Apps Script returned an HTTP error.",
        diagnostic: {
          httpStatus: response.status
        }
      });
    }

    return res.status(200).json(result);

  } catch (error) {
    console.error("Attendance backend connection error:", error);

    return res.status(502).json({
      success: false,
      message: "Could not connect to Google Apps Script. Check the deployment URL and backend availability."
    });
  }
}
