/* ==========================================================================
   Página: Registro de estudiantes (registro.html)
   Validación en tiempo real, indicador de seguridad (F09), coincidencia de
   contraseñas y prevención de registros duplicados (en el backend).
   ========================================================================== */
(async function () {
  try { if ((await API.call('me')).user) { location.replace('inicio.html'); return; } } catch (e) { /* sin conexión: se muestra el formulario */ }

  const f = (id) => document.getElementById(id);
  const form = f('registerForm');
  const alertBox = f('formAlert');
  const submit = f('submitBtn');

  // Semestres 1–10
  for (let i = 1; i <= 10; i++) f('semestre').insertAdjacentHTML('beforeend', `<option value="${i}">${i}.º semestre</option>`);

  f('strengthSlot').innerHTML = strengthMarkup();
  bindPasswordToggles();
  bindStrengthMeter(f('password'), $('.strength'), $('.rules'));

  // Código en mayúsculas mientras se escribe; celular solo dígitos
  f('codigo').addEventListener('input', (e) => { e.target.value = e.target.value.toUpperCase().replace(/[^U0-9]/g, ''); });
  f('telefono').addEventListener('input', (e) => { e.target.value = e.target.value.replace(/\D/g, ''); });

  const checks = {
    nombre: FormUI.bind(f('nombre'), (v) => Validators.nombre(v)),
    codigo: FormUI.bind(f('codigo'), (v) => Validators.codigo(v)),
    correo: FormUI.bind(f('correo'), (v) => Validators.correo(v)),
    programa: FormUI.bind(f('programa'), (v) => Validators.programa(v)),
    semestre: FormUI.bind(f('semestre'), (v) => Validators.semestre(v)),
    telefono: FormUI.bind(f('telefono'), (v) => Validators.telefono(v)),
    password: FormUI.bind(f('password'), (v) => Validators.password(v)),
    password2: FormUI.bind(f('password2'), (v) => (!v ? 'Confirma tu contraseña.' : v !== f('password').value ? 'Las contraseñas no coinciden.' : '')),
  };
  // Re-verificar la confirmación cuando cambia la contraseña
  f('password').addEventListener('input', () => { if (f('password2').value) checks.password2(); });

  const checkAcepta = () => {
    const ok = f('acepta').checked;
    f('aceptaField').classList.toggle('is-invalid', !ok);
    f('aceptaError').innerHTML = ok ? '' : `${icon('alert', 'icon-sm')}<span>Debes aceptar la política para continuar.</span>`;
    return ok;
  };
  f('acepta').addEventListener('change', checkAcepta);

  f('policyBtn').addEventListener('click', () => {
    Modal.open({
      title: 'Tratamiento de datos personales', iconName: 'shield',
      body: `
        <p class="muted">Texto de demostración. Reemplácelo por la política oficial de la UNAB antes de publicar el portal.</p>
        <p>Los datos que registras (nombre, código, correo, programa, semestre y celular) se usan únicamente para:</p>
        <ul class="policy-list">
          <li>Identificarte dentro de UNAB Campus HL.</li>
          <li>Registrar tus inscripciones y tu historial de Horas Libres.</li>
          <li>Mostrar tu avance y generar tu constancia.</li>
        </ul>
        <p class="small muted">Puedes consultar, actualizar o eliminar tu información desde la sección <strong>Mi perfil</strong>.</p>`,
      actions: [
        { label: 'Cerrar', class: 'btn-outline', value: false },
        { label: 'Acepto', class: 'btn-primary', onClick: ({ close }) => { f('acepta').checked = true; checkAcepta(); close(true); } },
      ],
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    alertBox.innerHTML = '';
    const results = Object.values(checks).map((fn) => fn());
    const ok = results.every(Boolean) & checkAcepta();
    if (!ok) {
      alertBox.innerHTML = `<div class="alert alert-danger">${icon('alert', 'icon-sm')}<span>Revisa los campos marcados en rojo.</span></div>`;
      $('.field.is-invalid input, .field.is-invalid select', form)?.focus();
      return;
    }
    FormUI.setLoading(submit, true, 'Creando cuenta…');
    try {
      await API.call('register', {
        nombre: f('nombre').value, codigo: f('codigo').value, correo: f('correo').value,
        programa: f('programa').value, semestre: f('semestre').value, telefono: f('telefono').value,
        password: f('password').value, acepta: f('acepta').checked,
      });
      Toast.success('¡Cuenta creada! Ahora inicia sesión.');
      setTimeout(() => { location.href = 'index.html?registrado=1'; }, 700);
    } catch (err) {
      FormUI.setLoading(submit, false);
      alertBox.innerHTML = `<div class="alert alert-danger">${icon('alert', 'icon-sm')}<span>${esc(err.message)}</span></div>`;
      if (/correo/i.test(err.message)) FormUI.setState(f('correo'), err.message);
      if (/código/i.test(err.message)) FormUI.setState(f('codigo'), err.message);
      alertBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });
})();
