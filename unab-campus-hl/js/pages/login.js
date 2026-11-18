/* ==========================================================================
   Página: Inicio de sesión (index.html)
   ========================================================================== */
(async function () {
  // Si ya hay una sesión activa, ir directo al panel principal
  try { if ((await API.call('me')).user) { location.replace('inicio.html'); return; } } catch (e) { /* sin conexión: se muestra el formulario */ }

  const form = $('#loginForm');
  const correo = $('#correo');
  const password = $('#password');
  const alertBox = $('#formAlert');
  const submit = $('#submitBtn');

  bindPasswordToggles();
  const vCorreo = FormUI.bind(correo, (v) => Validators.correo(v));
  const vPass = FormUI.bind(password, (v) => (v ? '' : 'Escribe tu contraseña.'));

  /** Solo se permite redirigir a páginas internas del portal. */
  const nextPage = () => {
    const n = getParam('next') || '';
    return /^[a-z-]+\.html(\?[\w=&-]*)?$/.test(n) && n !== 'index.html' ? n : 'inicio.html';
  };

  const showAlert = (msg, type = 'danger') => {
    alertBox.innerHTML = msg ? `<div class="alert alert-${type}">${icon(type === 'success' ? 'checkCircle' : 'alert', 'icon-sm')}<span>${esc(msg)}</span></div>` : '';
  };

  if (getParam('registrado')) showAlert('Tu cuenta fue creada correctamente. Ya puedes iniciar sesión.', 'success');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    showAlert('');
    const ok = [vCorreo(), vPass()].every(Boolean);
    if (!ok) { $('.field.is-invalid .input', form)?.focus(); return; }
    FormUI.setLoading(submit, true, 'Ingresando…');
    try {
      await API.call('login', { correo: correo.value, password: password.value, remember: $('#remember').checked });
      location.href = nextPage();
    } catch (err) {
      FormUI.setLoading(submit, false);
      showAlert(err.message);
      password.select();
    }
  });

  $('#useDemo').addEventListener('click', () => {
    correo.value = DEMO_USER.correo;
    password.value = DEMO_USER.password;
    FormUI.setState(correo, ''); FormUI.setState(password, '');
    submit.focus();
    Toast.show('Datos de la cuenta demo cargados. Pulsa “Ingresar”.');
  });

  // Restablecer contraseña verificando correo + código estudiantil
  $('#forgotBtn').addEventListener('click', () => {
    const m = Modal.open({
      title: 'Restablecer contraseña', iconName: 'lock',
      body: `
        <p class="muted small">Verifica tu identidad con tu correo institucional y tu código estudiantil, y define una nueva contraseña.</p>
        <form id="resetForm" novalidate>
          <div class="field"><label for="rCorreo">Correo institucional</label>
            <input class="input" id="rCorreo" type="email" placeholder="usuario@unab.edu.co" autocomplete="username" autofocus value="${esc(correo.value)}"><span class="field-error"></span></div>
          <div class="field"><label for="rCodigo">Código estudiantil</label>
            <input class="input" id="rCodigo" placeholder="U00123456"><span class="field-error"></span></div>
          <div class="field"><label for="rPass">Nueva contraseña</label>
            <div class="input-group"><span class="input-icon">${icon('lock')}</span>
            <input class="input" id="rPass" type="password" autocomplete="new-password">
            <button type="button" class="input-action" data-toggle-password="rPass" aria-label="Mostrar contraseña"></button></div>
            <span class="field-error"></span>${strengthMarkup()}</div>
        </form>`,
      actions: [
        { label: 'Cancelar', class: 'btn-outline', value: null },
        { label: 'Guardar contraseña', class: 'btn-primary', onClick: async ({ close, button, root }) => {
          const rc = $('#rCorreo', root), rk = $('#rCodigo', root), rp = $('#rPass', root);
          const ok = [FormUI.setState(rc, Validators.correo(rc.value)), FormUI.setState(rk, Validators.codigo(rk.value)), FormUI.setState(rp, Validators.password(rp.value))].every(Boolean);
          if (!ok) return;
          FormUI.setLoading(button, true, 'Guardando…');
          try {
            await API.call('resetPassword', { correo: rc.value, codigo: rk.value, nueva: rp.value });
            close(true); correo.value = rc.value; password.value = '';
            showAlert('Contraseña actualizada. Inicia sesión con tu nueva contraseña.', 'success');
          } catch (err) { FormUI.setLoading(button, false); Toast.error(err.message); }
        } },
      ],
    });
    bindPasswordToggles(m.el);
    bindStrengthMeter($('#rPass', m.el), $('.strength', m.el), $('.rules', m.el));
  });
})();
