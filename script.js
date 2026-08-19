const fittsFeedback = document.getElementById('fitts-feedback');
document.querySelectorAll('[data-target]').forEach((button) => {
  button.addEventListener('click', () => {
    const isLarge = button.dataset.target === 'large';
    fittsFeedback.textContent = isLarge
      ? 'Bolsa de 1 kg seleccionada: ideal para consumo frecuente o para compartir.'
      : 'Bolsa de 250 g seleccionada: perfecta para probar una variedad nueva.';
  });
});

const choices = document.querySelectorAll('.choice');
const hickFeedback = document.getElementById('hick-feedback');
choices.forEach((choice) => {
  choice.addEventListener('click', () => {
    choices.forEach((item) => item.setAttribute('aria-pressed', 'false'));
    choice.setAttribute('aria-pressed', 'true');
    hickFeedback.textContent = `Variedad seleccionada: ${choice.textContent}. La agruparemos con tu presentación elegida.`;
  });
});

// ---- Carrusel de cafés destacados ----
(function initCarousel() {
  const viewport = document.getElementById('carousel-viewport');
  const slides = Array.from(viewport.children);
  const prevBtn = document.getElementById('carousel-prev');
  const nextBtn = document.getElementById('carousel-next');
  const dotsWrap = document.getElementById('carousel-dots');

  slides.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'carousel-dot';
    dot.setAttribute('role', 'tab');
    dot.setAttribute('aria-label', `Ir al café ${i + 1} de ${slides.length}`);
    dot.addEventListener('click', () => {
      slides[i].scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
    });
    dotsWrap.appendChild(dot);
  });
  const dots = Array.from(dotsWrap.children);

  function updateActiveSlide() {
    const viewportRect = viewport.getBoundingClientRect();
    let closestIndex = 0;
    let closestDistance = Infinity;
    slides.forEach((slide, i) => {
      const rect = slide.getBoundingClientRect();
      const distance = Math.abs(rect.left - viewportRect.left);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = i;
      }
    });
    dots.forEach((dot, i) => dot.setAttribute('aria-current', i === closestIndex ? 'true' : 'false'));
    prevBtn.disabled = closestIndex === 0;
    nextBtn.disabled = closestIndex === slides.length - 1;
  }

  prevBtn.addEventListener('click', () => {
    viewport.scrollBy({ left: -(slides[0].getBoundingClientRect().width + 18), behavior: 'smooth' });
  });
  nextBtn.addEventListener('click', () => {
    viewport.scrollBy({ left: slides[0].getBoundingClientRect().width + 18, behavior: 'smooth' });
  });

  viewport.addEventListener('scroll', () => {
    window.clearTimeout(viewport._scrollTimer);
    viewport._scrollTimer = window.setTimeout(updateActiveSlide, 80);
  });

  viewport.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight') { nextBtn.click(); event.preventDefault(); }
    if (event.key === 'ArrowLeft') { prevBtn.click(); event.preventDefault(); }
  });

  updateActiveSlide();
})();

// ---- Formulario + almacenamiento (localStorage) ----
const STORAGE_KEY = 'granoyfuego_suscripciones';

// Memoria de respaldo: se usa automáticamente si localStorage no está
// disponible (por ejemplo, en modo privado muy restrictivo o si el usuario
// lo deshabilitó en su navegador). Así el sitio nunca se rompe, aunque en
// ese caso los datos no sobrevivirán a un recargo de página.
const memoryFallback = { value: null };
let storageMode = 'localStorage';

function isLocalStorageAvailable() {
  try {
    const testKey = '__granoyfuego_test__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    return true;
  } catch (err) {
    return false;
  }
}

if (typeof window === 'undefined' || !window.localStorage || !isLocalStorageAvailable()) {
  storageMode = 'memory';
  console.warn('localStorage no está disponible en este navegador. Las suscripciones se guardarán solo en memoria durante esta sesión.');
}

function storageGet(key) {
  if (storageMode === 'localStorage') {
    try {
      return window.localStorage.getItem(key);
    } catch (err) {
      console.error('Error al leer de localStorage:', err);
      return null;
    }
  }
  return memoryFallback.value;
}

function storageSet(key, value) {
  if (storageMode === 'localStorage') {
    try {
      window.localStorage.setItem(key, value);
      return true;
    } catch (err) {
      // Puede fallar por cuota excedida (QuotaExceededError) u otras
      // restricciones del navegador. Se hace fallback a memoria para que
      // la aplicación siga funcionando sin lanzar errores al usuario.
      console.error('Error al guardar en localStorage, se usará memoria temporal:', err);
      storageMode = 'memory';
      memoryFallback.value = value;
      return false;
    }
  }
  memoryFallback.value = value;
  return true;
}

function loadSubscriptions() {
  try {
    const raw = storageGet(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    // JSON corrupto o inesperado: no rompe la app, solo empieza limpio.
    console.error('No se pudieron leer las suscripciones guardadas:', err);
    return [];
  }
}

function saveSubscriptions(list) {
  try {
    storageSet(STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.error('No se pudieron guardar las suscripciones:', err);
  }
}

function renderSubscriptions() {
  const list = loadSubscriptions();
  const ul = document.getElementById('saved-list-items');
  const emptyMsg = document.getElementById('saved-empty-msg');
  ul.innerHTML = '';

  if (list.length === 0) {
    emptyMsg.style.display = 'block';
    return;
  }
  emptyMsg.style.display = 'none';

  list.forEach((entry) => {
    const li = document.createElement('li');

    const nameSpan = document.createElement('span');
    nameSpan.textContent = entry.name;

    const emailSpan = document.createElement('span');
    emailSpan.textContent = entry.email;

    li.appendChild(nameSpan);
    li.appendChild(emailSpan);
    ul.appendChild(li);
  });
}

const form = document.getElementById('registration-form');
const nameInput = document.getElementById('name');
const emailInput = document.getElementById('email');
const nameError = document.getElementById('name-error');
const emailError = document.getElementById('email-error');
const formFeedback = document.getElementById('form-feedback');

form.addEventListener('submit', (event) => {
  event.preventDefault();
  let valid = true;
  nameError.textContent = '';
  emailError.textContent = '';
  formFeedback.hidden = true;

  if (!nameInput.value.trim()) {
    nameError.textContent = 'Escribe tu nombre completo.';
    valid = false;
  }

  if (!emailInput.value.trim()) {
    emailError.textContent = 'Escribe tu correo electrónico.';
    valid = false;
  } else if (!emailInput.validity.valid) {
    emailError.textContent = 'Usa un formato válido, por ejemplo: nombre@correo.com.';
    valid = false;
  }

  if (valid) {
    const list = loadSubscriptions();
    list.push({ name: nameInput.value.trim(), email: emailInput.value.trim() });
    saveSubscriptions(list);
    renderSubscriptions();

    formFeedback.hidden = false;
    formFeedback.focus?.();
    form.reset();
  } else {
    const firstInvalid = !nameInput.value.trim() ? nameInput : emailInput;
    firstInvalid.focus();
  }
});

renderSubscriptions();
