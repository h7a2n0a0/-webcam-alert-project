export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Only POST requests allowed" });
  }

  const { text } = req.body;

  const webhookUrl = process.env.SLACK_WEBHOOK_URL; // 🔐 환경변수로 대체

  try {
    const slackRes = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    if (!slackRes.ok) {
      throw new Error("Slack request failed");
    }

    res.status(200).json({ message: "Slack message sent!" });
  } catch (err) {
    console.error("Slack error:", err);
    res.status(500).json({ error: "Failed to send message to Slack" });
  }
}