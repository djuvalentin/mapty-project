'use strict';

/////////// USER STORIES

// 1. As a user, I want to log my running workout, so I can keep log
//    of location, distance, duration and pace of my running activities
// 2. As a user, I want to log my cycling workout, so I can keep log
//    of location, distance, duration and speed of my running activities
// 3. As a user, I want to see my workouts at a glance, so I can have
//    a quick look at them.
// 4. As a user, I want to see my workouts on a map, so I can have any
//    overview of the location I wourked out at.
// 5. As a user, I want to save my location, so when I come back to the app
//    I still have my workouts.

//////////// FEATURES
// 1. Map (best way to get location coords)
//    Geolocation to pan the map to the current location
// 2. Form that recieves distance, duration, steps/min
// 3. Form that recieves distance, duration, elevation gain
// 4. Display workouts on the list
// 5. Display workouts on the map
// 6. Store the workouts using the localStorageAPI

///////////// GUIDE
// 1. Plan the project and create a flowchart
// 2. Get current coordinates
// 3. Use the leaflet library to display the map pointing to the
//    current location and try to customize tiles
// 4. Display map marker with a custom popup message after a click on the map.
//    Make sure the popup doesn't go away when clicking somewhere else.
//    also specify: maxwidth, minwidth, className
// 5. Render workout input form when user clicks on the map
//    When user submits - the map marker appears on the map where the user
//    previously clicked and input fields clear.
//    When user switches between workout type, Cadance switches
//    with Elevation input filed .
// 6. Organize code (Architecture). App, Wourkout, Cycling, Running classes/subclasses
// 7. Render workout on the map and to the list
//    Create workout and store
//    During data validation all inputs have to be numbers and every input
//    except elevation gain must be positive numbers
//    Render list item workout
// 8. Move to marker after click on a workout list element
//    Add an option for animation to panning to a marker
// 9. Store workouts to the local storage
//    Try to figure out how to fix the prototype chain issue on
//    the restored objects
//10. Create a way to delete all the data from localStorage
/////////////////IMPROVE APP//////////////////
// 11. Ability to edit a workout
// 11. Ability to delete a workout
// 11. Ability to delete all workouts
// 12. Sort workouts by a certain field
// 13. Fix the prototype issue with the data coming from localStorage
// NOTE: this is already fixed but see if there's a write a cleaner code (loadash deepclone);
// 14. Create more realistic error messages
//////// HARD///////////////
// 15. Ability to position the map to show all workouts
// 16. Ability to draw lines and sapes instead of just points
/////// IMPLEMENT AFTER ASYNC SECTION
// 17. Geocode location from the coordinates to add a better
//     description ("Run in Faro, Portugal")
// 18. Display weather data for workout time and place

// prettier-ignore
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const promptDeleteAll = document.querySelector('.prompt--delete_all');
const containerSortDeleteAll = document.querySelector('.sort_clear__btns');
const btnDeleteAll = document.querySelector('.btn--delete_all');

class App {
  #workouts = [];
  #workoutToManage = [];
  #lat;
  #lng;
  #map;

  constructor() {
    // Set up map
    navigator.geolocation.getCurrentPosition(
      this.#setMap.bind(this),
      this.#renderGeolocError
    );
    // Restore workouts from localStorage
    this.#restoreLocalStorage();

    // Render restored workouts
    this.#renderWorkoutElements();

    // Submit workout
    form.addEventListener('submit', this.#submitWorkout.bind(this));

    // Toggle elevation
    inputType.addEventListener('change', this.#toggleElevation);

    // Toggle edit and delete buttons
    // prettier-ignore
    containerWorkouts.addEventListener('mouseover', this.#showWorkoutBtns.bind(this));
    // prettier-ignore
    containerWorkouts.addEventListener('mouseout', this.#hideWorkoutBtns.bind(this));

    // Pan to workout's location
    containerWorkouts.addEventListener('click', this.#panToLocation.bind(this));

    // Edit workout
    containerWorkouts.addEventListener('click', this.#editWorkout.bind(this));

    // Delete workout
    // prettier-ignore
    containerWorkouts.addEventListener('click', this.#promptDeleteWokrout.bind(this));

    // Prompt to delete all workouts
    // prettier-ignore
    btnDeleteAll.addEventListener('click', this.#promptDeleteAll.bind(this));

    // Confirm deleting all workouts
    // prettier-ignore
    promptDeleteAll.addEventListener('click', this.#deleteAllWorkouts.bind(this));

    // Cancel editing or deleting
    window.addEventListener('keydown', this.#escapeKeyAction.bind(this));

    // Confirm deleting
    containerWorkouts.addEventListener('click', this.#deleteWorkout.bind(this));
  }
  #renderWorkoutMarkers() {
    this.#workouts.forEach(workout => {
      this.#renderMarker(workout);
    });
  }

  #renderWorkoutElements() {
    this.#workouts.forEach(workout => {
      this.#renderNewWorkout(workout);
    });
  }

  #renderMap(lat, lng) {
    this.#map = L.map('map').setView([lat, lng], 14);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Tiles style by <a href="https://www.hotosm.org/" target="_blank">Humanitarian OpenStreetMap Team</a> hosted by <a href="https://openstreetmap.fr/" target="_blank">OpenStreetMap France</a>',
    }).addTo(this.#map);
  }
  #showForm() {
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  #triggerInput(e) {
    this.#lat = e.latlng.lat;
    this.#lng = e.latlng.lng;

    this.#cancelCurrentAction();
    this.#showForm();
  }

  #setMap(position) {
    // Get current position coords
    const { latitude, longitude } = position.coords;

    // Load map
    this.#renderMap(latitude, longitude);

    // Render saved markers

    this.#renderWorkoutMarkers();

    // Map Event Listener
    this.#map.on('click', this.#triggerInput.bind(this));
  }

  #renderGeolocError() {
    alert(
      `Could not access geolocation, please allow access to your location for this page and reload!`
    );
  }
  #positiveNumbers(...inputs) {
    return inputs.every(input => Number.isFinite(input) && input > 0);
  }
  #renderInvalidInputError() {
    alert('Incorrect input. All the values must be positive numbers');
  }
  #setWorkoutCoords(workout) {
    workout.locationCoords = [this.#lat, this.#lng];
  }
  #generateMarkup(workout) {
    let html = `
  <li class="workout workout--${workout.type}" data-id="${workout.id}">
    <h2 class="workout__title">${workout.description}</h2>
    <div class="workout__btns hidden">
      <button class="btn btn__edit">
        <img class="icon--manage__workout" src="./icons/edit.svg" />
      </button>
      <button class="btn btn--delete">
        <img class="icon--manage__workout" src="./icons/trash-2.svg" />
      </button>
    </div>
    <div class="workout__details">
      <span class="workout__icon">${
        workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
      }</span>
      <span class="workout__value">${workout.distance}</span>
      <span class="workout__unit">km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⏱</span>
      <span class="workout__value">${workout.duration}</span>
      <span class="workout__unit">min</span>
    </div> `;
    if (workout.type === 'running')
      html += `
    <div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${workout.pace.toFixed(2)}</span>
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
      <span class="workout__value">${workout.speed.toFixed(2)}</span>
      <span class="workout__unit">km/h</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⛰</span>
      <span class="workout__value">${workout.elevation}</span>
      <span class="workout__unit">m</span>
    </div>
  </li>`;
    return html;
  }
  #renderNewWorkout(workout) {
    form.insertAdjacentHTML('afterend', this.#generateMarkup(workout));
    containerSortDeleteAll.classList.remove('hidden');
  }
  #renderUpdatedWorkout(workout, oldDomEl) {
    oldDomEl.insertAdjacentHTML('afterend', this.#generateMarkup(workout));
  }

  #renderMarker(workout) {
    const workoutPopup = L.popup().setContent(
      `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
    );

    const layer = L.marker(workout.locationCoords)
      .addTo(this.#map)
      .bindPopup(workoutPopup, {
        maxWidth: 300,
        minWidth: 50,
        autoClose: false,
        closeOnClick: false,
        className: `${workout.type}-popup`,
      })
      .openPopup();

    workout.marker = layer;
  }
  #clearFormFields() {
    inputDistance.value = '';
    inputDuration.value = '';
    inputCadence.value = '';
    inputElevation.value = '';
  }
  #hideForm() {
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(function () {
      form.style.display = 'grid';
    }, 1000);
  }
  #resetForm() {
    form.classList.remove('form--update');
    this.#clearFormFields();
  }
  #submitNewWorkout(type, distance, duration, cadence, elevation) {
    let workout;

    if (type === 'running') {
      if (!this.#positiveNumbers(distance, duration, cadence))
        return this.#renderInvalidInputError();
      workout = new Running(distance, duration, cadence);
    }
    if (type === 'cycling') {
      if (
        !this.#positiveNumbers(distance, duration) ||
        !Number.isFinite(elevation)
      )
        return this.#renderInvalidInputError();

      workout = new Cycling(distance, duration, elevation);
    }
    // Add coordinates to the workout
    this.#setWorkoutCoords(workout);

    // Store workout
    this.#workouts.push(workout);

    //Store workouts to the localStorage
    this.#storeLocalStorage();

    // Render workout on the list
    this.#renderNewWorkout(workout);

    // Render marker to the map
    this.#renderMarker(workout);
  }
  #clearWorkoutToManageArray() {
    this.#workoutToManage.splice(0, this.#workoutToManage.length);
  }
  #submitUpdatedWorkout(type, distance, duration, cadence, elevation) {
    let [workout, workoutEl] = this.#workoutToManage;

    workout.distance = distance;
    workout.duration = duration;

    if (workout.type !== type) {
      if (type === 'cycling') {
        Object.setPrototypeOf(workout, Cycling.prototype);
        workout.elevation = elevation;
        workout.cadence = null;
        workout.speed = workout.calcSpeed();
        workout.description = workout.description.replace('Running', 'Cycling');
      }
      if (type === 'running') {
        Object.setPrototypeOf(workout, Running.prototype);
        workout.elevation = null;
        workout.cadence = cadence;
        workout.pace = workout.calcPace();
        workout.description = workout.description.replace('Cycling', 'Running');
      }
    } else {
      if (type === 'cycling') {
        workout.elevation = elevation;
        workout.speed = workout.calcSpeed();
      }
      if (type === 'running') {
        workout.cadence = cadence;
        workout.pace = workout.calcPace();
      }
    }
    workout.type = type;

    // Clear edit elements from the array
    this.#clearWorkoutToManageArray();
    // Render workout
    this.#renderUpdatedWorkout(workout, workoutEl);

    // Store workouts
    this.#storeLocalStorage();

    // Remove old workout DOM element
    workoutEl.remove();

    // Remove form--update class and set the state of the form

    form.classList.remove('form--update');
    form.dataset.state = type;

    // Remove marker
    this.#map.removeLayer(workout.marker);
    workout.marker = null;

    // Render new marker
    this.#renderMarker(workout);
  }

  #submitWorkout(e) {
    e.preventDefault();
    // Get input data
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const cadence = +inputCadence.value;
    const elevation = +inputElevation.value;

    // Submit new workout
    if (!form.classList.contains('form--update'))
      this.#submitNewWorkout(type, distance, duration, cadence, elevation);

    // Submit updated workout
    if (form.classList.contains('form--update')) {
      this.#submitUpdatedWorkout(type, distance, duration, cadence, elevation);
      form.classList.remove('form--update');
    }

    // reset form
    this.#resetForm();

    // Hide form
    this.#hideForm();

    // Set form current state
    form.dataset.state = type;
  }

  #toggleElevation() {
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
  }
  #showWorkoutBtns(e) {
    const workoutEl = e.target.closest('.workout');
    if (!workoutEl) return;
    workoutEl.querySelector('.workout__btns').classList.remove('hidden');
  }
  #hideWorkoutBtns(e) {
    if (e.target.classList.contains('workout')) {
      const workoutBtnContainers =
        containerWorkouts.querySelectorAll('.workout__btns');
      workoutBtnContainers.forEach(c => c.classList.add('hidden'));
    }
  }

  #findWorkoutByID(id) {
    return this.#workouts.find(workout => workout.id === id);
  }
  #panToLocation(e) {
    const workoutEl = e.target.closest('.workout');
    if (!workoutEl || e.target.classList.contains('btn')) return;

    const workout = this.#findWorkoutByID(workoutEl.dataset.id);
    this.#map.panTo(workout.locationCoords, { animate: true, duration: 1 });
  }
  #replacer(key, value) {
    if (key == 'marker') return undefined;
    else return value;
  }
  #storeLocalStorage() {
    localStorage.setItem(
      'workouts',
      JSON.stringify(this.#workouts, this.#replacer)
    );
  }
  #restoreLocalStorage() {
    const workouts = JSON.parse(localStorage.getItem('workouts'));
    if (!workouts) return;
    workouts.forEach(workout => {
      let restoredWorkout;
      if (workout.type === 'running') {
        restoredWorkout = Object.create(Running.prototype);
        restoredWorkout.cadence = workout.cadence;
        restoredWorkout.pace = workout.pace;
      }
      if (workout.type === 'cycling') {
        restoredWorkout = Object.create(Cycling.prototype);
        restoredWorkout.elevation = workout.elevation;
        restoredWorkout.speed = workout.speed;
      }
      restoredWorkout.id = workout.id;
      restoredWorkout.type = workout.type;
      restoredWorkout.description = workout.description;
      restoredWorkout.distance = workout.distance;
      restoredWorkout.duration = workout.duration;
      restoredWorkout.locationCoords = workout.locationCoords;

      this.#workouts.push(restoredWorkout);
    });
  }
  #showHiddenWorkoutEls() {
    document
      .querySelectorAll('.workout')
      .forEach(el => el.classList.remove('hidden'));
  }
  #btnClicked(event, el, classname) {
    return (
      el &&
      event.target.closest('.btn') &&
      event.target.closest('.btn').classList.contains(classname)
    );
  }

  #editWorkout(e) {
    // Find target element and instance
    const workoutEl = e.target.closest('.workout');
    if (!this.#btnClicked(e, workoutEl, 'btn__edit')) return;

    // Cancel any potentially initiated actions
    this.#cancelCurrentAction();

    const workout = this.#findWorkoutByID(workoutEl.dataset.id);

    // Show any potentially hidden workout elements
    this.#showHiddenWorkoutEls();

    // Hide target workout from list'
    workoutEl.classList.add('hidden');

    // Show form
    this.#showForm();
    if (workout.type !== form.dataset.state) this.#toggleElevation();

    inputDistance.value = workout.distance;
    inputDuration.value = workout.duration;

    if (workout.type === 'running') {
      inputType.options[0].selected = true;
      inputCadence.value = workout.cadence;
    }
    if (workout.type === 'cycling') {
      inputType.options[1].selected = true;
      inputElevation.value = workout.elevation;
    }
    form.classList.add('form--update');
    form.dataset.state = workout.type;

    // Store elements that need editing
    this.#workoutToManage.push(workout, workoutEl);
  }
  removeWorkouts() {
    localStorage.removeItem('workouts');
    location.reload();
  }
  get workouts() {
    return this.#workouts;
  }
  #togglePromptDeleteAll() {
    promptDeleteAll.classList.toggle('hidden');
  }
  #promptDeleteAll() {
    // Cancel any previously initiated action
    this.#cancelCurrentAction();

    // Hide all workouts
    [...containerWorkouts.children].forEach(el => el.classList.add('hidden'));

    // Show prompt message
    this.#togglePromptDeleteAll();
  }
  #hidePromptDeleteAll() {
    promptDeleteAll.classList.add('hidden');
  }
  #toggleSortDeleteAll() {
    containerSortDeleteAll.classList.toggle('hidden');
  }
  #cancelCurrentAction() {
    // Reset form
    this.#resetForm();

    // Show all workouts
    this.#showHiddenWorkoutEls();

    // Remove any potential temporary elements
    this.#clearWorkoutToManageArray();

    // Escape delete prompt
    this.#removePromptDelete();

    // Escape delete all prompt
    this.#hidePromptDeleteAll();
  }
  #deleteAllWorkouts(e) {
    const btn = e.target.closest('.prompt__btn');
    if (!btn) return;

    if (btn.dataset.type === 'yes') {
      // Remove workouts from the list
      document
        .querySelectorAll('.workout')
        .forEach(workoutEl => workoutEl.remove());

      // Remove map pins
      this.#workouts.forEach(workout => this.#map.removeLayer(workout.marker));

      // Clear workouts array
      this.#workouts.splice(0, this.#workouts.length);

      // Clear local storage
      localStorage.removeItem('workouts');

      // Hide prompt
      this.#togglePromptDeleteAll();

      // Toggle Delete All btn
      this.#toggleSortDeleteAll();
    }
    if (btn.dataset.type === 'no') {
      this.#cancelCurrentAction();
    }
  }
  #removePromptDelete() {
    const promptDelete = document.querySelector('.prompt--delete');
    return promptDelete && promptDelete.remove();
  }

  #escapeKeyAction(e) {
    if (e.key === 'Escape') {
      this.#hideForm();
      this.#cancelCurrentAction();
    }
  }
  #renderDeletePrompt(workout, workoutEl) {
    const html = `
    <li class="prompt prompt--delete">
    <h2 class="prompt__question">
      Are you sure you want to delete ${workout.description}?
    </h2>
    <div class="prompt__btns">
      <button
        class="btn prompt__btn prompt__btn--delete"
        data-type="yes"
      >
        Yes
      </button>
      <button
        class="btn prompt__btn prompt__btn--delete"
        data-type="no"
      >
        No
      </button>
        </div>
      </li>`;

    workoutEl.insertAdjacentHTML('afterEnd', html);
  }
  #promptDeleteWokrout(e) {
    // Find target element and instance
    const workoutEl = e.target.closest('.workout');
    if (!this.#btnClicked(e, workoutEl, 'btn--delete')) return;

    const workout = this.#findWorkoutByID(workoutEl.dataset.id);

    // Cancel any potentially initiated actions
    this.#hideForm();
    this.#cancelCurrentAction();

    // Hide html workout element
    workoutEl.classList.toggle('hidden');

    // Render delete prompt
    this.#renderDeletePrompt(workout, workoutEl);

    // Store temporary workout
    this.#workoutToManage.push(workout, workoutEl);
  }
  #deleteWorkout(e) {
    const btn = e.target.closest('.prompt__btn--delete');
    if (!btn) return;

    const [workout, workoutEl] = this.#workoutToManage;

    if (btn.dataset.type === 'yes') {
      // Remove marker from the map
      this.#map.removeLayer(workout.marker);

      // Delete workout from the app
      this.#workouts.splice(this.#workouts.indexOf(workout), 1);

      // Update local storage
      this.#storeLocalStorage();

      // Delete html workout el
      workoutEl.remove();

      // Empty temporary workout array
      this.#clearWorkoutToManageArray();

      // Hide prompt
      document.querySelector('.prompt--delete').remove();

      // Hide Delete All Btn
      if (!this.#workouts.length) this.#toggleSortDeleteAll();
    }

    if (btn.dataset.type === 'no') {
      this.#cancelCurrentAction();
    }
  }
}

class Workout {
  #date = new Date();
  id = (Date.now() + '').slice(-10);
  type;
  description;

  constructor(distance, duration) {
    this.distance = distance;
    this.duration = duration;
  }
  get date() {
    return this.#date;
  }
  setDescription(date = this.#date) {
    return `${this.type[0].toUpperCase() + this.type.slice(1)} on ${
      months[date.getMonth()]
    } ${date.getDate()}`;
  }
}
class Running extends Workout {
  pace;
  constructor(distance, duration, cadence) {
    super(distance, duration);
    this.type = 'running';
    this.description = this.setDescription();
    this.cadence = cadence;
    this.pace = this.calcPace();
  }
  calcPace() {
    return this.duration / this.distance;
  }
}
class Cycling extends Workout {
  speed;
  constructor(distance, duration, elevation) {
    super(distance, duration);
    this.type = 'cycling';
    this.description = this.setDescription();
    this.elevation = elevation;
    this.speed = this.calcSpeed();
  }
  calcSpeed() {
    return this.distance / (this.duration / 60);
  }
}

const app = new App();

//TODO:
// 1. Implement sort buttons
//    sort by? duration? distance? speed/pace?
// 1. Try to make the restoring from local storage cleaner by using loadash deepclone
