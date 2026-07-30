// A senha é enviada somente para a API; o navegador recebe um cookie de sessão seguro.
const form = document.getElementById('loginForm');
const passwordInput = document.getElementById('password');
const toggleButton = document.getElementById('togglePassword');
const message = document.getElementById('loginMessage');

toggleButton.addEventListener('click', () => {
    const showing = passwordInput.type === 'text';
    passwordInput.type = showing ? 'password' : 'text';
    toggleButton.setAttribute('aria-label', showing ? 'Mostrar senha' : 'Ocultar senha');
    toggleButton.querySelector('i').className = showing ? 'far fa-eye' : 'far fa-eye-slash';
});

form.addEventListener('submit', async event => {
    event.preventDefault();
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    message.hidden = true;

    try {
        const response = await fetch('/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: passwordInput.value })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Não foi possível entrar.');
        window.location.replace('/dashboard.html');
    } catch (error) {
        message.textContent = error.message;
        message.hidden = false;
        passwordInput.select();
    } finally {
        submitButton.disabled = false;
    }
});
