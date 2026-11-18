/* ==========================================================================
   Página: Perfil del estudiante (perfil.html)
   Consulta y edición de datos, foto, cambio de contraseña y eliminación
   ========================================================================== */
(async function () {
  let user = await App.init({ page: 'perfil', title: 'Mi perfil', crumb: 'Cuenta' });
  const f = (id) => document.getElementById(id);
  const form = f('profileForm');
  const fields = ['nombre', 'programa', 'semestre', 'telefono'];

  for (let i = 1; i <= 10; i++) f('semestre').insertAdjacentHTML('beforeend', `<option value="${i}">${i}.º semestre</option>`);

  /* ---------- Encabezado ---------- */
  const renderHead = () => {
    f('pAvatar').innerHTML = App.avatarHTML(user, 'avatar-xl');
    f('pName').textContent = user.nombre;
    f('pMeta').textContent = [user.codigo, user.programa, user.semestre ? `${user.semestre}.º semestre` : ''].filter(Boolean).join(' · ');
    f('pBadges').innerHTML = `
      <span class="badge">${icon('mail', 'icon-sm')} ${esc(user.correo)}</span>
      ${user.telefono ? `<span class="badge badge-neutral">${icon('phone', 'icon-sm')} ${esc(user.telefono)}</span>` : ''}
      ${user.demo ? '<span class="badge badge-demo">Cuenta demo</span>' : ''}`;
    f('removePhoto').classList.toggle('hidden', !user.foto);
    // Avatar de la barra superior
    $$('.user-trigger .avatar').forEach((a) => { a.outerHTML = App.avatarHTML(user); });
    const nm = $('.user-trigger-name'); if (nm) nm.textContent = firstName(user.nombre);
    const dh = $('.dropdown-head strong'); if (dh) dh.textContent = user.nombre;
  };

  /* ---------- Formulario ---------- */
  const fill = () => {
    f('nombre').value = user.nombre; f('codigo').value = user.codigo; f('correo').value = user.correo;
    f('programa').value = user.programa || ''; f('semestre').value = user.semestre || ''; f('telefono').value = user.telefono || '';
    fields.forEach((k) => FormUI.clear(f(k)));
    dirty();
  };
  const dirty = () => {
    const changed = fields.some((k) => String(f(k).value).trim() !== String(user[k] ?? '').trim());
    f('saveBtn').disabled = !changed; f('discardBtn').disabled = !changed;
    return changed;
  };
  const checks = {
    nombre: FormUI.bind(f('nombre'), (v) => Validators.nombre(v)),
    programa: FormUI.bind(f('programa'), (v) => Validators.programa(v)),
    telefono: FormUI.bind(f('telefono'), (v) => Validators.telefono(v)),
  };
  f('telefono').addEventListener('input', (e) => { e.target.value = e.target.value.replace(/\D/g, ''); });
  fields.forEach((k) => { f(k).addEventListener('input', dirty); f(k).addEventListener('change', dirty); });
  f('discardBtn').addEventListener('click', () => { fill(); Toast.show('Cambios descartados.'); });

  const save = async (extra = {}) => {
    const { user: u } = await API.call('updateProfile', {
      nombre: f('nombre').value, programa: f('programa').value, semestre: f('semestre').value, telefono: f('telefono').value,
      foto: user.foto || '', ...extra,
    });
    user = u; App.user = u;
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!Object.values(checks).map((fn) => fn()).every(Boolean)) return;
    const btn = f('saveBtn');
    FormUI.setLoading(btn, true, 'Guardando…');
    try { await save(); FormUI.setLoading(btn, false); fill(); renderHead(); Toast.success('Tus datos se guardaron correctamente.'); }
    catch (err) { FormUI.setLoading(btn, false); Toast.error(err.message); }
  });

  /* ---------- Foto de perfil ---------- */
  f('photoInput').addEventListener('change', async (e) => {
    const file = e.target.files[0]; e.target.value = '';
    if (!file) return;
    if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) { Toast.error('Selecciona una imagen JPG, PNG o WEBP.'); return; }
    if (file.size > 5 * 1024 * 1024) { Toast.error('La imagen supera los 5 MB.'); return; }
    try {
      const dataUrl = await resizeImage(file, 320);
      await API.call('updateProfile', { nombre: user.nombre, programa: user.programa, semestre: user.semestre || '', telefono: user.telefono, foto: dataUrl })
        .then((r) => { user = r.user; App.user = r.user; });
      renderHead(); Toast.success('Foto de perfil actualizada.');
    } catch (err) { Toast.error(err.message || 'No fue posible procesar la imagen.'); }
  });
  f('removePhoto').addEventListener('click', async () => {
    const ok = await Modal.confirm({ title: '¿Quitar la foto?', message: 'Se mostrarán tus iniciales en lugar de la foto.', confirmText: 'Quitar foto' });
    if (!ok) return;
    const r = await API.call('updateProfile', { nombre: user.nombre, programa: user.programa, semestre: user.semestre || '', telefono: user.telefono, foto: '' });
    user = r.user; App.user = r.user; renderHead(); Toast.success('Foto eliminada.');
  });

  /** Redimensiona la imagen en un canvas cuadrado para no saturar el almacenamiento. */
  function resizeImage(file, size) {
    return new Promise((resolve, reject) => {
      const img = new Image(); const url = URL.createObjectURL(file);
      img.onload = () => {
        const c = document.createElement('canvas'); c.width = c.height = size;
        const s = Math.min(img.width, img.height);
        c.getContext('2d').drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
        URL.revokeObjectURL(url); resolve(c.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No fue posible leer la imagen.')); };
      img.src = url;
    });
  }

  /* ---------- Resumen ---------- */
  const s = App.summary;
  f('miniSummary').innerHTML = `
    <div class="mini-sum">
      ${ringHTML(s.porcentaje, 'cumplido')}
      <ul class="stat-list">
        <li><span>Cumplidas</span><strong>${s.cumplidas} h</strong></li>
        <li><span>Pendientes</span><strong>${s.pendientes} h</strong></li>
        <li><span>Requeridas${s.requeridasDemo ? ' (demo)' : ''}</span><strong>${s.requeridas} h</strong></li>
      </ul>
    </div>
    <a class="btn btn-sm btn-outline btn-block" href="horas-libres.html">Ver historial</a>`;
  animateRings();

  /* ---------- Cambiar contraseña ---------- */
  f('pwBtn').addEventListener('click', () => {
    const m = Modal.open({
      title: 'Cambiar contraseña', iconName: 'lock',
      body: `
        <form novalidate>
          <div class="field"><label for="pwA">Contraseña actual</label>
            <div class="input-group"><span class="input-icon">${icon('lock')}</span><input class="input" type="password" id="pwA" autocomplete="current-password" autofocus>
            <button type="button" class="input-action" data-toggle-password="pwA" aria-label="Mostrar contraseña"></button></div><span class="field-error"></span></div>
          <div class="field"><label for="pwN">Nueva contraseña</label>
            <div class="input-group"><span class="input-icon">${icon('shield')}</span><input class="input" type="password" id="pwN" autocomplete="new-password">
            <button type="button" class="input-action" data-toggle-password="pwN" aria-label="Mostrar contraseña"></button></div><span class="field-error"></span>${strengthMarkup()}</div>
          <div class="field"><label for="pwC">Confirmar nueva contraseña</label>
            <input class="input" type="password" id="pwC" autocomplete="new-password"><span class="field-error"></span></div>
        </form>`,
      actions: [
        { label: 'Cancelar', class: 'btn-outline', value: null },
        { label: 'Actualizar contraseña', class: 'btn-primary', onClick: async ({ close, button, root }) => {
          const a = $('#pwA', root), n = $('#pwN', root), c = $('#pwC', root);
          const ok = [
            FormUI.setState(a, a.value ? '' : 'Escribe tu contraseña actual.'),
            FormUI.setState(n, Validators.password(n.value) || (n.value === a.value ? 'La nueva contraseña debe ser diferente.' : '')),
            FormUI.setState(c, c.value !== n.value ? 'Las contraseñas no coinciden.' : ''),
          ].every(Boolean);
          if (!ok) return;
          FormUI.setLoading(button, true, 'Actualizando…');
          try { await API.call('changePassword', { actual: a.value, nueva: n.value }); close(true); Toast.success('Contraseña actualizada.'); }
          catch (err) { FormUI.setLoading(button, false); FormUI.setState(a, err.message); }
        } },
      ],
    });
    bindPasswordToggles(m.el);
    bindStrengthMeter($('#pwN', m.el), $('.strength', m.el), $('.rules', m.el));
  });

  /* ---------- Eliminar cuenta ---------- */
  f('deleteBtn').addEventListener('click', () => {
    Modal.open({
      title: '¿Eliminar tu cuenta?', iconName: 'alert', danger: true,
      body: `
        <p class="muted">Se eliminarán de forma permanente tu perfil, inscripciones, historial de Horas Libres y horario. Escribe tu contraseña para confirmar.</p>
        <div class="field"><label for="delPw">Contraseña</label><input class="input" type="password" id="delPw" autocomplete="current-password" autofocus><span class="field-error"></span></div>`,
      actions: [
        { label: 'Cancelar', class: 'btn-outline', value: null },
        { label: 'Eliminar definitivamente', class: 'btn-danger', onClick: async ({ button, root }) => {
          const pw = $('#delPw', root);
          if (!FormUI.setState(pw, pw.value ? '' : 'Escribe tu contraseña.')) return;
          FormUI.setLoading(button, true, 'Eliminando…');
          try { await API.call('deleteAccount', { password: pw.value }); location.href = 'index.html'; }
          catch (err) { FormUI.setLoading(button, false); FormUI.setState(pw, err.message); }
        } },
      ],
    });
  });

  renderHead();
  fill();
})();
