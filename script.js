'use strict';

// prettier - ignore;
const months = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/*
/////////////////////////////////////////
// Modal window

const openModal = function (e) {
  e.preventDefault();
  modal.classList.remove('hidden');
  overlay.classList.remove('hidden');
};

const closeModal = function () {
  modal.classList.add('hidden');
  overlay.classList.add('hidden');
};

btnsOpenModal.forEach(btnOpenModal =>
  btnOpenModal.addEventListener('click', openModal)
);

btnCloseModal.addEventListener('click', closeModal);
overlay.addEventListener('click', closeModal);

document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
    closeModal();
  }
});
*/

const formHTML = `
  <form class="form form_gen hidden">
    <div class="form__row">
      <label class="form__label">Type</label>
      <select class="form__input form__input--type">
        <option value="running">Running</option>
        <option value="cycling">Cycling</option>
      </select>
    </div>
    <div class="form__row">
      <label class="form__label">Distance</label>
      <input class="form__input form__input--distance" placeholder="km" />
    </div>
    <div class="form__row">
      <label class="form__label">Duration</label>
      <input
        class="form__input form__input--duration"
        placeholder="min"
      />
    </div>
    <div class="form__row">
      <label class="form__label">Cadence</label>
      <input
        class="form__input form__input--cadence"
        placeholder="step/min"
      />
    </div>
    <div class="form__row form__row--hidden">
      <label class="form__label">Elev Gain</label>
      <input
        class="form__input form__input--elevation"
        placeholder="meters"
      />
    </div>
    <button class="form__btn">OK</button>
  </form>
`;

let form_gen = document.querySelector('.form_gen');
const form_modal = document.querySelector('.form_modal');

const containerWorkouts = document.querySelector('.workouts');
const inputType = form_gen.querySelector('.form__input--type');
const inputDistance = form_gen.querySelector('.form__input--distance');
const inputDuration = form_gen.querySelector('.form__input--duration');
const inputCadence = form_gen.querySelector('.form__input--cadence');
const inputElevation = form_gen.querySelector('.form__input--elevation');

// Select the inputs in the Form Modal
const inpType = form_modal.querySelector('.form__input--type');
const inpDistance = form_modal.querySelector('.form__input--distance');
const inpDuration = form_modal.querySelector('.form__input--duration');
const inpCadence = form_modal.querySelector('.form__input--cadence');
const inpElevation = form_modal.querySelector('.form__input--elevation');
const btnCloseModal = document.querySelector('.btn--close-modal');

let containerEditBtns;

const modal = document.querySelector('.modal');
const overlay = document.querySelector('.overlay');

// Validation Functions
const validInputs = (...inputs) => inputs.every(inp => Number.isFinite(inp));
const allPositive = (...inputs) => inputs.every(inp => inp > 0);

const validateInputs = (type, ...inputs) => {
  // const inputs = [distance, duration, cadence, elevationGain]
  const errorData = ['Distance', 'Duration', 'Cadence', 'Elevation Gain'];
  const errors = [];

  inputs.forEach((inp, i) => {
    if (type === 'running' && i === 3) return;
    if (type === 'cycling' && i === 2) return;
    !validInputs(inp) &&
      errors.push({ inp: errorData[i], errType: 'validity' });
    !allPositive(inp) &&
      errors.push({ inp: errorData[i], errType: 'positivity' });
  });

  const invalidInputs = errors
    .filter(err => err.errType === 'validity')
    .map(err => err.inp);

  const negativeInputs = errors
    .filter(err => err.errType === 'positivity')
    .map(err => err.inp);

  // prettier-ignore
  if (invalidInputs.length > 0 || negativeInputs.length > 0) {
    const invalidMessage = invalidInputs.length > 0 ? `${invalidInputs.join(', ')} must be valid numbers.` : '';
    const negativeMessage = negativeInputs.length > 0 ? `${negativeInputs.join(', ')} must be positive numbers.` : '';
    alert(`${invalidMessage}\n${negativeMessage}`);
    return false;
  }

  return true;
};

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords; // [lat, lng]
    this.distance = distance; // in km
    this.duration = duration; // in min
  }

  _setDescription() {
    // Make this.date an object again instead of a string.
    this.date = new Date(this.date);

    this.description1 = `${
      this.type[0].toUpperCase() + this.type.slice(1)
    } on ${months[this.date.getMonth()]} ${this.date.getDate()}`;

    const [lat, lng] = this.coords;
    fetch(
      `https://geocode.xyz/${lat},${lng}?geoit=json&auth=169881644183211876370x1205`
    )
      .then(response => response.json())
      .then(data => {
        console.log(data);
        console.log(
          `https://geocode.xyz/${lat},${lng}?geoit=json&auth=169881644183211876370x1205`
        );
        this.description2 = `${
          this.type[0].toUpperCase() + this.type.slice(1)
        } in ${data.city}, ${data.country || data.region}`;
      });
  }

  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = 'running';

  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    // this.pace = this.duration / this.distance;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';

  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    // min/km
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

// const run1 = new Running([39, -12], 5.2, 24, 178);
// const cycling1 = new Cycling([39, -12], 27, 95, 523);
// console.log(run1, cycling1);

////////////////////////////////////////
// APPLICATION ARCHITECTURE
class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];

  constructor() {
    // Get users's position
    this._getPosition();

    // Get data from local storage
    this._getLocalStorage();

    // Attach event handlers
    form_gen.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener(
      'change',
      this._toggleElevationField.bind(this, 'general')
    );
    inpType.addEventListener(
      'change',
      this._toggleElevationField.bind(this, 'modal')
    );

    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    btnCloseModal.addEventListener('click', this._closeModal.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), () => {
        alert("Couldn't get your position");
      });
    return this;
  }

  _loadMap(position) {
    const { latitude, longitude } = position.coords;
    // console.log(`https://www.google.com.ng/maps/@${latitude},${longitude}`);

    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    this.#workouts.forEach(work => {
      work._setDescription();
      setTimeout(() => {
        this._renderWorkoutList(work);
        this._renderWorkoutMarker(work);
      }, 2000);
    });

    // Handling clicks on map
    this.#map.on('click', this._showForm.bind(this));
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form_gen.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    // Empty Inputs
    form_gen.style.display = 'none';
    form_gen.classList.add('hidden');
    setTimeout(() => (form_gen.style.display = 'grid'), 1000);
    inputDistance.value =
      inputCadence.value =
      inputDuration.value =
      inputElevation.value =
        '';
  }

  _toggleElevationField(formType, e) {
    if (formType === 'general') {
      // prettier-ignore
      inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
      inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    }

    if (formType === 'modal') {
      // prettier-ignore
      inpElevation.closest('.form__row').classList.toggle('form__row--hidden');
      inpCadence.closest('.form__row').classList.toggle('form__row--hidden');
    }
  }

  _newWorkout(e) {
    e.preventDefault();

    // Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // If workout running, create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;
      // Check if data is valid
      if (
        // !Number.isFinite(distance) ||
        // !Number.isFinite(duration) ||
        // !Number.isFinite(cadence)
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Inputs have to be positive numbers');

      // setTimeout(
      //   () => (
      workout = new Running([lat, lng], distance, duration, cadence);
      //   ),
      //   5000
      // );
    }

    // If workout cycling, create cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;

      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('Inputs have to be positive numbers');

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }
    setTimeout(() => {
      // Add the new object to the work out array
      this.#workouts.push(workout);
      // console.log(workout);

      // Render workout on map as marker
      this._renderWorkoutMarker(workout);

      // Render workout on list
      this._renderWorkoutList(workout);

      // Hide form + clear input fields
      this._hideForm();

      // Set local storage to all workouts
      this._setLocalStorage();
    }, 5000);
  }

  _editWorkout(workout, e) {
    e.preventDefault();

    const isValid = validateInputs(
      inpType.value,
      +inpDistance.value,
      +inpDuration.value,
      +inpCadence.value,
      +inpElevation.value
    );

    if (!isValid) return;

    // Edit the Workout Object
    workout.type = inpType.value;
    workout.distance = inpDistance.value;
    workout.duration = inpDuration.value;

    if (workout.type === 'running') {
      workout.cadence = inpCadence.value;

      // Changing prototype to that of the new Workout type
      Object.setPrototypeOf(workout, Running.prototype);

      workout.calcPace();
    }

    if (workout.type === 'cycling') {
      workout.elevationGain = +inpElevation.value;

      // Changing prototype to that of the new Workout type
      Object.setPrototypeOf(workout, Cycling.prototype);

      workout.calcSpeed();
    }

    workout._setDescription();

    // Empty workouts container
    containerWorkouts.innerHTML = formHTML;

    // Re-select form_gen element so form_gen's parentNode won't be null
    form_gen = document.querySelector('.form_gen');

    setTimeout(() => {
      this.#workouts.forEach(work => {
        this._renderWorkoutMarker(work);
        this._renderWorkoutList(work);

        // Hide form + clear input fields
        // this._hideForm();

        // Set local storage to all workouts
        this._setLocalStorage();
      });
    }, 2000);

    // Close the modal
    this._closeModal();
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
          content: `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♂️'} ${
            workout.description2 || workout.description1
          }`,
        })
      )
      .openPopup();
  }

  _renderWorkoutList(workout) {
    let html = `
      <li class="workout workout--${workout.type}" data-id="${workout.id}">
        <h2 class="workout__title">${
          workout.description2 || workout.description1
        }</h2>
        <img class="edit" src="edit.png" alt="">
        <div class="workout__details">
          <span class="workout__icon">${
            workout.type === 'running' ? '🏃‍♂️' : '🚴‍♂️'
          }</span>
          <span class="workout__value">${workout.distance}</span>
          <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <span class="workout__value">${workout.duration}</span>
          <span class="workout__unit">min</span>
        </div>
    `;

    // console.log(workout, workout.type);

    if (workout.type === 'running')
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.pace.toFixed(1)}</span>
          <span class="workout__unit">min/km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">🦶🏼</span>
          <span class="workout__value">${workout.cadence}</span>
          <span class="workout__unit">spm</span>
        </div>
      </li>`;

    if (workout.type === 'cycling')
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.speed.toFixed(1)}</span>
          <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⛰</span>
          <span class="workout__value">${workout.elevationGain}</span>
          <span class="workout__unit">m</span>
        </div>
      </li>`;

    form_gen.insertAdjacentHTML('afterend', html);

    // Attach the event listener to the new edit button
    // console.log(form_gen);
    const newEditBtn = form_gen.nextElementSibling.querySelector('.edit');
    newEditBtn.addEventListener('click', this._openModal.bind(this, workout));

    // Update containerEditBtns if needed
    containerEditBtns = document.querySelectorAll('.edit');
  }

  _moveToPopup(e) {
    // console.log(e.target);
    const workoutEl = e.target.closest('.workout');
    if (!workoutEl || e.target.tagName === 'IMG') return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
    workout.click();
  }

  _openModal(workout, e) {
    e.preventDefault();

    // Fill the form with the current workout data
    inpType.value = workout.type;
    inpDistance.value = workout.distance;
    inpDuration.value = workout.duration;

    // Check for workout type to set either cadence or elevation
    if (workout.type === 'running') {
      inpCadence.value = workout.cadence;
      inpCadence.closest('.form__row').classList.remove('form__row--hidden');
      inpElevation.closest('.form__row').classList.add('form__row--hidden');
    }

    if (workout.type === 'cycling') {
      inpElevation.value = workout.elevationGain;
      inpCadence.closest('.form__row').classList.add('form__row--hidden');
      inpElevation.closest('.form__row').classList.remove('form__row--hidden');
    }

    // Show the modal
    modal.classList.remove('hidden');
    overlay.classList.remove('hidden');
    inpDistance.focus();

    form_modal.addEventListener(
      'submit',
      this._editWorkout.bind(this, workout),
      { once: true }
    );
  }

  _closeModal(e) {
    // try {
    //   e.preventDefault();
    // } catch (err) {
    //   console.log(err);
    // } finally {
    //   modal.classList.add('hidden');
    //   overlay.classList.add('hidden');
    // }
    modal.classList.add('hidden');
    overlay.classList.add('hidden');
    inpDistance.value =
      inpCadence.value =
      inpDuration.value =
      inpElevation.value =
        '';
  }

  _setLocalStorage() {
    // localStorage.clear();
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;
    // console.log(data);

    data.map(work => {
      if (work.type === 'running') {
        Object.setPrototypeOf(work, Running.prototype);
      } else if (work.type === 'cycling') {
        Object.setPrototypeOf(work, Cycling.prototype);
      }
    });
    this.#workouts = data;

    // this.#workouts.forEach(work => {
    //   this._renderWorkoutList(work);
    // });
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

const app = new App();
