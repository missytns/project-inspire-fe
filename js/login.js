(function () {
  const API_BASE_URL = "https://uplifting-cheese-44a7f505da.strapiapp.com";
  const AUTH_STORAGE_KEY = "inspireAuth";
  const LOGIN_SESSION_KEY = "inspireLoginPassed";
  const form = document.getElementById("loginForm");
  const email = document.getElementById("email");
  const password = document.getElementById("password");
  const error = document.getElementById("loginError");
  const submit = form?.querySelector('button[type="submit"]');

  localStorage.removeItem(AUTH_STORAGE_KEY);
  sessionStorage.removeItem(LOGIN_SESSION_KEY);

  function showError(message) {
    if (!error) return;
    error.textContent = message;
    error.hidden = false;
  }

  function clearError() {
    if (!error) return;
    error.textContent = "";
    error.hidden = true;
  }

  form?.addEventListener("submit", async function (event) {
    event.preventDefault();
    clearError();

    const identifier = email?.value.trim();
    const userPassword = password?.value;

    if (!identifier || !userPassword) {
      showError("Please enter your email and password.");
      return;
    }

    if (submit) {
      submit.disabled = true;
      submit.textContent = "Logging in...";
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/local`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier,
          password: userPassword,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.jwt) {
        throw new Error(payload.error?.message || "Invalid email or password.");
      }

      localStorage.setItem(
        AUTH_STORAGE_KEY,
        JSON.stringify({
          jwt: payload.jwt,
          user: payload.user || null,
        })
      );
      sessionStorage.setItem(LOGIN_SESSION_KEY, "true");
      window.location.replace("home.html");
    } catch (loginError) {
      showError(loginError.message || "Login failed. Please try again.");
    } finally {
      if (submit) {
        submit.disabled = false;
        submit.textContent = "Login";
      }
    }
  });
})();
