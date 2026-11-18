/* ==========================================================================
   Validaciones de formularios (compartidas por registro, login y perfil)
   ========================================================================== */

const Validators = {
  correo(v) {
    v = String(v || '').trim();
    if (!v) return 'Escribe tu correo institucional.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'El formato del correo no es válido.';
    if (!new RegExp(`^[a-z0-9._%+-]+@${CONFIG.DOMINIO_CORREO.replace(/\./g, '\\.')}$`, 'i').test(v)) return `Usa tu correo institucional @${CONFIG.DOMINIO_CORREO}.`;
    return '';
  },
  nombre(v) {
    v = String(v || '').trim();
    if (!v) return 'Escribe tu nombre completo.';
    if (!/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' ]+$/.test(v)) return 'El nombre solo puede contener letras y espacios.';
    if (v.split(/\s+/).length < 2) return 'Escribe al menos un nombre y un apellido.';
    if (v.length > 80) return 'El nombre es demasiado largo.';
    return '';
  },
  codigo(v) {
    v = String(v || '').trim();
    if (!v) return 'Escribe tu código estudiantil.';
    if (!/^U00\d{6}$/i.test(v)) return 'El código debe tener el formato U00 seguido de 6 dígitos (ej.: U00123456).';
    return '';
  },
  telefono(v) {
    v = String(v || '').trim();
    if (!v) return '';
    if (!/^3\d{9}$/.test(v.replace(/\s/g, ''))) return 'Escribe un celular colombiano de 10 dígitos que inicie en 3.';
    return '';
  },
  semestre(v) {
    if (v === '' || v == null) return '';
    const n = Number(v);
    return n >= 1 && n <= 12 ? '' : 'Selecciona un semestre válido.';
  },
  programa(v) { return String(v || '').length > 100 ? 'El nombre del programa es demasiado largo.' : ''; },

  passwordRules(p) {
    p = String(p || '');
    return {
      length: p.length >= 8,
      upper: /[A-ZÁÉÍÓÚÑ]/.test(p),
      lower: /[a-záéíóúñ]/.test(p),
      number: /\d/.test(p),
      special: /[^A-Za-z0-9ÁÉÍÓÚÑáéíóúñ]/.test(p),
    };
  },
  /** F09: nivel 0 vacío, 1 débil, 2 media, 3 fuerte. */
  passwordStrength(p) {
    const r = this.passwordRules(p);
    const score = Object.values(r).filter(Boolean).length + (String(p || '').length >= 12 ? 1 : 0);
    if (!p) return { level: 0, label: 'Sin contraseña', rules: r };
    if (!r.length || score <= 3) return { level: 1, label: 'Débil', rules: r };
    if (score === 4 || !(r.upper && r.lower && r.number && r.special)) return { level: 2, label: 'Media', rules: r };
    return { level: 3, label: 'Fuerte', rules: r };
  },
  password(p) {
    if (!p) return 'Escribe una contraseña.';
    return this.passwordStrength(p).level < 3 ? 'La contraseña debe ser fuerte: cumple todos los requisitos.' : '';
  },

  assertRegister(d) {
    const err = this.nombre(d.nombre) || this.codigo(d.codigo) || this.correo(d.correo) || this.password(d.password) ||
      this.telefono(d.telefono) || this.semestre(d.semestre) || this.programa(d.programa);
    if (err) throw new ApiError(err);
    if (!d.acepta) throw new ApiError('Debes aceptar la política de tratamiento de datos personales.');
  },
  assertProfile(d) {
    const err = this.nombre(d.nombre) || this.telefono(d.telefono) || this.semestre(d.semestre) || this.programa(d.programa);
    if (err) throw new ApiError(err);
  },
};

/**
 * Asistente para validar formularios en tiempo real.
 * Cada campo .field contiene .input y .field-error.
 */
const FormUI = {
  setState(input, message) {
    const field = input.closest('.field');
    if (!field) return !message;
    const errEl = field.querySelector('.field-error');
    field.classList.toggle('is-invalid', !!message);
    field.classList.toggle('is-valid', !message && input.value.trim() !== '');
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
    if (errEl) errEl.innerHTML = message ? `${icon('alert', 'icon-sm')}<span>${esc(message)}</span>` : '';
    return !message;
  },
  clear(input) {
    const field = input.closest('.field');
    field?.classList.remove('is-invalid', 'is-valid');
    input.removeAttribute('aria-invalid');
  },
  /** Vincula validación en vivo: valida al salir del campo y al escribir si ya tenía error. */
  bind(input, validator) {
    let touched = false;
    const run = () => this.setState(input, validator(input.value));
    input.addEventListener('blur', () => { touched = true; run(); });
    input.addEventListener('input', () => { if (touched || input.closest('.field').classList.contains('is-invalid')) run(); });
    return run;
  },
  setLoading(btn, loading, text) {
    if (loading) { btn.dataset.label = btn.innerHTML; btn.disabled = true; btn.innerHTML = `<span class="spinner" aria-hidden="true"></span>${esc(text || 'Procesando…')}`; }
    else { btn.disabled = false; if (btn.dataset.label) btn.innerHTML = btn.dataset.label; }
  },
};

/** Botón mostrar / ocultar contraseña. */
function bindPasswordToggles(root = document) {
  $$('[data-toggle-password]', root).forEach((btn) => {
    const input = document.getElementById(btn.dataset.togglePassword);
    btn.innerHTML = icon('eye');
    btn.addEventListener('click', () => {
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.innerHTML = icon(show ? 'eyeOff' : 'eye');
      btn.setAttribute('aria-label', show ? 'Ocultar contraseña' : 'Mostrar contraseña');
      btn.setAttribute('aria-pressed', String(show));
    });
  });
}

/** Marcado del indicador de seguridad + lista de requisitos. */
function strengthMarkup() {
  return `
    <div class="strength" data-level="0" aria-live="polite">
      <div class="strength-track" aria-hidden="true"><span></span><span></span><span></span></div>
      <div class="strength-label">Seguridad de la contraseña</div>
    </div>
    <ul class="rules" aria-label="Requisitos de la contraseña">
      <li data-rule="length">Mínimo 8 caracteres</li>
      <li data-rule="upper">Una letra mayúscula</li>
      <li data-rule="lower">Una letra minúscula</li>
      <li data-rule="number">Un número</li>
      <li data-rule="special">Un carácter especial (!@#*…)</li>
    </ul>`;
}

/** F09: conecta un campo de contraseña con su barra de seguridad y lista de reglas. */
function bindStrengthMeter(input, meter, rulesList) {
  const update = () => {
    const s = Validators.passwordStrength(input.value);
    meter.dataset.level = s.level;
    meter.querySelector('.strength-label').textContent = s.level ? `Seguridad: ${s.label}` : 'Seguridad de la contraseña';
    if (rulesList) Object.entries(s.rules).forEach(([k, ok]) => rulesList.querySelector(`[data-rule="${k}"]`)?.classList.toggle('ok', ok));
  };
  input.addEventListener('input', update); update();
}
