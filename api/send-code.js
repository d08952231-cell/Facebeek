module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  const { email, code } = req.body;
  const dbUrl = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;

  // Достаем временную запись с кодом
  const pendingRes = await fetch(`${dbUrl}/pendingUsers/${email.replace(/\./g, ',')}.json`);
  const pendingData = await pendingRes.json();

  if (!pendingData) {
    return res.status(400).json({ error: "Код устарел. Запросите новый." });
  }

  // Проверяем код
  if (pendingData.code.toString() !== code.toString()) {
    return res.status(400).json({ error: "Неверный код подтверждения" });
  }

  // Создаем пользователя в Firebase Auth через REST API (безопасно, без клиентских ключей)
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const signUpRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`, {
    method: "POST",
    body: JSON.stringify({ email, password: code + "_salt_mess", returnSecureToken: true }),
    headers: { "Content-Type": "application/json" },
  });

  const signUpData = await signUpRes.json();

  if (signUpData.error) {
    if (signUpData.error.message === "EMAIL_EXISTS") {
      return res.status(400).json({ error: "Этот email уже зарегистрирован" });
    }
    return res.status(500).json({ error: "Ошибка создания аккаунта" });
  }

  // Удаляем временную запись
  await fetch(`${dbUrl}/pendingUsers/${email.replace(/\./g, ',')}.json`, { method: "DELETE" });

  // Возвращаем данные клиенту
  res.status(200).json({
    idToken: signUpData.idToken,
    localId: signUpData.localId,
    name: pendingData.name,
    username: pendingData.username,
  });
};
