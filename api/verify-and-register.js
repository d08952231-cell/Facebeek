const nodemailer = require("nodemailer");

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  const { email, name, username } = req.body;

  // Генерируем 6-значный код
  const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

  // Сохраняем код и данные юзера временно в Firebase Realtime DB
  // (Точки в email меняем на запятые, так как Firebase не любит точки в ключах)
  const dbUrl = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;
  await fetch(`${dbUrl}/pendingUsers/${email.replace(/\./g, ',')}.json`, {
    method: "PUT",
    body: JSON.stringify({ code: verificationCode, name, username, createdAt: Date.now() }),
  });

  // Отправка почты через Nodemailer (данные берем из секретов Vercel)
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  try {
    await transporter.sendMail({
      from: `"Мессенджер" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Код подтверждения",
      html: `<b>Ваш код:</b> <h2 style="color:blue;">${verificationCode}</h2>`,
    });
    res.status(200).json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Не удалось отправить письмо" });
  }
};
