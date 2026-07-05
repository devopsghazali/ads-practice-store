const crypto = require("crypto");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { email, name } = req.body || {};
  if (!email) {
    res.status(400).json({ error: "Email is required" });
    return;
  }

  const apiKey = process.env.MAILCHIMP_API_KEY;
  const listId = process.env.MAILCHIMP_LIST_ID;
  if (!apiKey || !listId) {
    res.status(500).json({ error: "Mailchimp is not configured on the server" });
    return;
  }

  const dc = apiKey.split("-").pop();
  const hash = crypto.createHash("md5").update(email.trim().toLowerCase()).digest("hex");

  try {
    const mcRes = await fetch(`https://${dc}.api.mailchimp.com/3.0/lists/${listId}/members/${hash}`, {
      method: "PUT",
      headers: {
        Authorization: `Basic ${Buffer.from(`anystring:${apiKey}`).toString("base64")}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email_address: email,
        status_if_new: "subscribed",
        merge_fields: name ? { FNAME: name } : undefined
      })
    });

    const data = await mcRes.json();
    if (!mcRes.ok) {
      res.status(mcRes.status).json({ error: data.detail || "Mailchimp error" });
      return;
    }
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Request to Mailchimp failed" });
  }
};
