/* global Module */

/* Magic Mirror
 * Module: WeatherForecast
 *
 * By Michael Teeuw http://michaelteeuw.nl
 * MIT Licensed.
 */

Module.register("car2go",{

	// Default module config.
	defaults: {
		appID: "",
		maxNumberOfCars: 10,
		updateInterval: 5 * 60 * 1000, // every five minutes
		animationSpeed: 1000,
		timeFormat: config.timeFormat,
		fade: false,
		fadePoint: 0.25, // Start on 1/4th of the list.

		initialLoadDelay: 2000, // 2.5 seconds delay. This delay is used to keep the OpenWeather API happy.
		retryDelay: 2000,

		car2goURL: 'https://www.car2go.com/api/v2.1/vehicles',
		mapsURL: 'https://maps.googleapis.com/maps/api/js',
		apiVersion: "v2.1",
		apiBase: "http://www.car2go.com/api/",
		carsEndpoint: "vehicles",

		calendarClass: "calendar"
	},

	// create a variable for the first upcoming calendaar event. Used if no location is specified.
	firstEvent: false,

	// create a variable to hold the location name based on the API result.
	fetchedLocatioName: "",

	// Define required scripts.
	getScripts: function() {
		return ["moment.js"];
	},

	// Define required scripts.
	getStyles: function() {
		return ["car2go.css"];
	},

	// Define required translations.
	getTranslations: function() {
		// The translations for the defaut modules are defined in the core translation files.
		// Therefor we can just return false. Otherwise we should have returned a dictionairy.
		// If you're trying to build yiur own module including translations, check out the documentation.
		return false;
	},

	// Define start sequence.
	start: function() {
		Log.info("Starting module: " + this.name);

		// Set locale.
		moment.locale(this.config.language);

		this.cars = [];
		this.loaded = false;
		this.getCars()
		//this.scheduleUpdate(this.config.initialLoadDelay);

		//this.updateTimer = null;
	},

	// Override dom generator.
	getDom: function() {
		var wrapper = document.createElement("div");

		if (this.config.Car2Go.appid === "") {
			wrapper.innerHTML = "Please set the correct Car2Go <i>appid</i> in the config for module: " + this.name + ".";
			wrapper.className = "dimmed light small";
			return wrapper;
		}

		// if (this.config.Maps.appid === "") {
		// 	wrapper.innerHTML = "Please set the correct Google Maps <i>appid</i> in the config for module: " + this.name + ".";
		// 	wrapper.className = "dimmed light small";
		// 	return wrapper;
		// }

		if (!this.loaded) {
			wrapper.innerHTML = this.translate("LOADING");
			wrapper.className = "dimmed light small";
			return wrapper;
		}

		if (this.cars.length == 0){
			wrapper.innerHTML = "No cars found.";
			wrapper.className = "dimmed light small";
			return wrapper;
		}

		var table = document.createElement("table");
		table.className = "small";
		for (var c in this.cars){
			var car = this.cars[c];

			var row = document.createElement("tr");
			table.appendChild(row);

			var smartCell = document.createElement("td");
			smartCell.className = "smart";
			if (car.smartPhoneRequired){
				smartCell.innerHTML = "*";
			} else{
				smartCell.innerHTML = " ";
			}
			row.appendChild(smartCell);

			var locCell = document.createElement("td");
			locCell.className = "loc";
			locCell.innerHTML = car.address;
			row.appendChild(locCell);

			if (this.config.fade && this.config.fadePoint < 1) {
				if (this.config.fadePoint < 0) {
					this.config.fadePoint = 0;
				}
				var startingPoint = this.cars.length * this.config.fadePoint;
				var steps = this.cars.length - startingPoint;
				if (f >= startingPoint) {
					var currentStep = f - startingPoint;
					row.style.opacity = 1 - (1 / steps * currentStep);
				}
			}
		}

		return table;

	},

	getCars: function(){

		if (this.config.Car2Go.appID === "") {
			Log.error("Car2Go: APPID not set!");
			return;
		}

		this.sendSocketNotification("GET_CARS",{
			config: this.config
		});
		//self.scheduleUpdate(this.config.updateInterval);
	},

	// Override getHeader method.
	getHeader: function() {
		if (this.config.appendLocationNameToHeader) {
			return this.data.header + " " + this.fetchedLocatioName;
		}

		return this.data.header;
	},
	notificationReceived: function(notification, payload, sender) {
		if (notification === "DOM_OBJECTS_CREATED") {
			if (this.config.appendLocationNameToHeader) {
				this.hide(0, {lockString: this.identifier});
			}
		}
		if (notification === "CALENDAR_EVENTS") {
			var senderClasses = sender.data.classes.toLowerCase().split(" ");
			if (senderClasses.indexOf(this.config.calendarClass.toLowerCase()) !== -1) {
				var lastEvent =  this.firstEvent;
				this.firstEvent = false;

				for (e in payload) {
					var event = payload[e];
					if (event.location || event.geo) {
						this.firstEvent = event;
						//Log.log("First upcoming event with location: ", event);
						break;
					}
				}
			}
		}
	},
	// Override notification handler.
	socketNotificationReceived: function(notification, payload) {
		if (notification === "Car2Go") {
			this.limitRange(payload);
			//self.scheduleUpdate((self.loaded) ? -1 : self.config.retryDelay);
			self.loaded = true;

		}
	},

  limitRange: function(data) {
  	this.cars = [];
    for (var i = 0, count = data.length; i < count; i++) {
      var car = data[i];
      if ( car.coordinates[0] >= this.config.Car2Go.searchArea.NW.lng &
           car.coordinates[0] <= this.config.Car2Go.searchArea.SE.lng &
           car.coordinates[1] <= this.config.Car2Go.searchArea.NW.lat &
           car.coordinates[1] >= this.config.Car2Go.searchArea.SE.lat){
        this.cars.push(car);
      }
    }
    this.show(this.config.animationSpeed, {lockString:this.identifier});
    this.loaded = true;
		this.updateDom(this.config.animationSpeed);
  },

  getDistances: function(){
  },

//?key='+ this.config.MapsappID + '&callback=initMap'
	getMapsParams: function() {
		var params = "?";
		params += "key=" + this.config.Maps.appID;
		params += "&callback=initMap";
		return params
	},
	/* scheduleUpdate()
	 * Schedule next update.
	 *
	 * argument delay number - Milliseconds before next update. If empty, this.config.updateInterval is used.
	 */
	// scheduleUpdate: function(delay) {
	// 	var nextLoad = this.config.updateInterval;
	// 	if (typeof delay !== "undefined" && delay >= 0) {
	// 		nextLoad = delay;
	// 	}

	// 	var self = this;
	// 	clearTimeout(this.updateTimer);
	// 	console.log("Clearing and updating updateTimer")
	// 	this.updateTimer = setTimeout(self.getCars(), nextLoad);

	// },

});
