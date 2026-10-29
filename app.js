const modal=document.querySelector('#video-dialog');
if(modal){const video=modal.querySelector('video');let opener;document.querySelectorAll('[data-video]').forEach(b=>b.addEventListener('click',()=>{opener=b;video.poster=b.dataset.band==='БРЕНД'?'assets/brend-promo-poster.webp':'assets/mybach-live.webp';video.src=b.dataset.video;modal.setAttribute('aria-label','Промо '+b.dataset.band);modal.showModal();document.body.classList.add('modal-open');}));const close=()=>modal.close();modal.querySelector('.close-dialog').addEventListener('click',close);modal.addEventListener('click',e=>{if(e.target===modal){const r=modal.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();}});modal.addEventListener('close',()=>{video.pause();video.removeAttribute('src');video.load();document.body.classList.remove('modal-open');opener?.focus();});}

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

const photoDialog = document.querySelector('#photo-dialog');
if (photoDialog) {
  const photos = [...document.querySelectorAll('[data-gallery-src]')];
  const view = photoDialog.querySelector('.photo-view');
  const caption = photoDialog.querySelector('.photo-caption');
  const counter = photoDialog.querySelector('.photo-counter');
  let current = 0, photoOpener, swipeStart;
  const showPhoto = index => {
    current = (index + photos.length) % photos.length;
    const tile = photos[current];
    view.src = tile.dataset.gallerySrc;
    view.alt = tile.querySelector('img').alt;
    caption.textContent = view.alt;
    counter.textContent = `${current + 1} / ${photos.length}`;
  };
  photos.forEach((tile, index) => tile.addEventListener('click', () => {
    photoOpener = tile;
    showPhoto(index);
    photoDialog.showModal();
    document.body.classList.add('modal-open');
  }));
  photoDialog.querySelector('.photo-close').addEventListener('click', () => photoDialog.close());
  photoDialog.querySelector('.photo-prev').addEventListener('click', () => showPhoto(current - 1));
  photoDialog.querySelector('.photo-next').addEventListener('click', () => showPhoto(current + 1));
  photoDialog.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      showPhoto(current + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });
  view.addEventListener('pointerdown', event => {
    if (event.pointerType === 'touch') swipeStart = {x: event.clientX, y: event.clientY};
  });
  view.addEventListener('pointerup', event => {
    if (!swipeStart) return;
    const dx = event.clientX - swipeStart.x, dy = event.clientY - swipeStart.y;
    swipeStart = undefined;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3) showPhoto(current + (dx < 0 ? 1 : -1));
  });
  view.addEventListener('pointercancel', () => { swipeStart = undefined; });
  photoDialog.addEventListener('click', event => {
    if (event.target !== photoDialog) return;
    const bounds = photoDialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) photoDialog.close();
  });
  photoDialog.addEventListener('close', () => {
    document.body.classList.remove('modal-open');
    swipeStart = undefined;
    photoOpener?.focus({preventScroll: true});
  });
}
