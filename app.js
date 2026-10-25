const modal=document.querySelector('#video-dialog');
if(modal){const video=modal.querySelector('video');let opener;document.querySelectorAll('[data-video]').forEach(b=>b.addEventListener('click',()=>{opener=b;video.poster=b.dataset.band==='БРЕНД'?'assets/brend-live-vocal.webp':'assets/mybach-live.webp';video.src=b.dataset.video;modal.setAttribute('aria-label','Промо '+b.dataset.band);modal.showModal();document.body.classList.add('modal-open');}));const close=()=>modal.close();modal.querySelector('.close-dialog').addEventListener('click',close);modal.addEventListener('click',e=>{if(e.target===modal){const r=modal.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();}});modal.addEventListener('close',()=>{video.pause();video.removeAttribute('src');video.load();document.body.classList.remove('modal-open');opener?.focus();});}

const bookingForm = document.querySelector('.booking-form');
if (bookingForm) {
  const band = new URLSearchParams(window.location.search).get('band');
  if (['brend', 'mybach', 'help'].includes(band)) bookingForm.elements.band.value = band;

  const result = bookingForm.querySelector('.form-result');
  const submit = bookingForm.querySelector('[type="submit"]');
  const label = submit.querySelector('.submit-label');
  let submitting = false;

  bookingForm.addEventListener('input', () => { result.hidden = true; });
  bookingForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (submitting || !bookingForm.reportValidity()) return;
    const person = bookingForm.elements.person;
    const contact = bookingForm.elements.contact;
    if (!person.value.trim() || !contact.value.trim()) {
      const empty = !person.value.trim() ? person : contact;
      empty.value = '';
      empty.reportValidity();
      return;
    }

    result.hidden = true;
    // Add a booking endpoint only after the recipient and delivery service are configured.
    // An unconfigured form must never claim that an application was delivered.
    const endpoint = bookingForm.dataset.endpoint;
    if (!endpoint) {
      result.textContent = 'Не удалось отправить заявку — попробуйте позже';
      result.hidden = false;
      result.focus({ preventScroll: true });
      return;
    }

    const payload = Object.fromEntries(new FormData(bookingForm));
    const controls = [...bookingForm.elements];
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    submitting = true;
    controls.forEach(control => { control.disabled = true; });
    bookingForm.setAttribute('aria-busy', 'true');
    label.textContent = 'Отправляем…';
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      if (!response.ok) throw new Error('Delivery failed');
      const confirmation = await response.json();
      if (confirmation.success !== true) throw new Error('Delivery not confirmed');
      result.textContent = 'Заявка отправлена — свяжемся с вами, чтобы обсудить детали';
      bookingForm.reset();
      if (['brend', 'mybach', 'help'].includes(band)) bookingForm.elements.band.value = band;
    } catch {
      result.textContent = 'Не удалось отправить заявку — данные остались в форме, попробуйте ещё раз';
    } finally {
      clearTimeout(timeout);
      submitting = false;
      controls.forEach(control => { control.disabled = false; });
      bookingForm.removeAttribute('aria-busy');
      label.textContent = 'Отправить заявку';
      result.hidden = false;
      result.focus({ preventScroll: true });
    }
  });
}

document.querySelectorAll('.music-orbit').forEach(section => {
  const stage = section.querySelector('.repertoire-orbit');
  const allSongs = [...stage.querySelectorAll('.orbit-song')];
  const toggle = section.querySelector('.orbit-toggle');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let songs = allSongs, width = 0, height = 0;
  let phase = 0, frame = 0, previous = 0, inView = false, paused = false;

  function paint() {
    const rx = width * (width < 600 ? 0.55 : 0.43);
    const ry = height * 0.39;
    songs.forEach((song, index) => {
      const angle = phase + index / songs.length * Math.PI * 2;
      const x = Math.cos(angle) * rx;
      const y = Math.sin(angle) * ry;
      song.style.transform = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0) translate(-50%,-50%)`;
    });
  }
  function tick(now) {
    if (previous) phase = (phase + Math.min(now - previous, 64) / 78000 * Math.PI * 2) % (Math.PI * 2);
    previous = now;
    paint();
    frame = requestAnimationFrame(tick);
  }
  function sync() {
    cancelAnimationFrame(frame);
    previous = 0;
    toggle.hidden = reduced.matches;
    if (inView && !paused && !reduced.matches && !document.hidden) frame = requestAnimationFrame(tick);
  }
  allSongs.forEach(song => { song.style.left = '50%'; song.style.top = '50%'; });
  new ResizeObserver(() => {
    width = stage.clientWidth;
    height = stage.clientHeight;
    songs = allSongs.filter(song => getComputedStyle(song).display !== 'none');
    paint();
  }).observe(stage);
  new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; sync(); }).observe(section);
  toggle.addEventListener('click', () => {
    paused = !paused;
    toggle.setAttribute('aria-pressed', String(paused));
    toggle.setAttribute('aria-label', paused ? 'Продолжить движение песен' : 'Остановить движение песен');
    sync();
  });
  reduced.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
});
