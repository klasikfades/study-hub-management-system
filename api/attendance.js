
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      success: false,
      message: "Method not allowed."
    });
  }

  const scriptUrl = process.env.APPS_SCRIPT_URL;

  if (!scriptUrl) {
    return res.status(500).json({
      success: false,
      message: "Backend URL is not configured in Vercel."
    });
  }

  try {
    const body = req.body || {};
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
      return res.status(502).json({
        success: false,
        message: "The Google Apps Script backend returned an unexpected response."
      });
    }

    return res.status(200).json(result);
  } catch (error) {
    return res.status(502).json({
      success: false,
      message: "Could not connect to the attendance backend. Please try again."
    });
  }
}
