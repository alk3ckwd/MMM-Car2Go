/* Magic Mirror
 * Node Helper: Car2Go
 *
 * By mmcvicar
 * {{LICENSE}} Licensed.
 */

var NodeHelper = require("node_helper");
var request = require("request");


module.exports = NodeHelper.create({
  // Override socketNotificationReceived method.

  /* socketNotificationReceived(notification, payload)
   * This method is called when a socket notification arrives.
   *
   * argument notification string - The identifier of the noitication.
   * argument payload mixed - The payload of the notification.
   */

  start: function() {
    console.log("Starting node helper for: " + this.name);
    this.queryInfo = {}
    this.updateTimer = null
    //this.scheduleUpdate(this.queryInfo.config.initialLoadDelay);
  },

  socketNotificationReceived: function(notification, payload) {

    if (notification === "GET_CARS") {
      console.log("Working notification system. Notification:", notification, "payload: ", payload.config);
      this.queryInfo = payload
      //this.queryCars();
      this.scheduleUpdate(this.queryInfo.config.initialLoadDelay);
  }
},


  // Test another function
  queryCars: function() {
    var results = {}
    console.log("Querying Car2Go for ", this.queryInfo.config.Car2Go.location)
    if (this.queryInfo.config.Car2Go.appID === "") {
      console.log("Car2GO: APPID not set!");
      return;
    }

    var params = "?";
    params += "loc=" + this.queryInfo.config.Car2Go.location;
    params += "&oauth_consumer_key=" + this.queryInfo.config.Car2Go.appID;
    params += "&format=" + this.queryInfo.config.Car2Go.format;
    var url = this.queryInfo.config.car2goURL + params;
    console.log("Car2Go URL: " + url)
    var that = this;

    request({url: url, method: 'GET'}, function(error, response, body){
      var result = JSON.parse(body);
      if (!error && response.statusCode == 200){
        that.sendSocketNotification('Car2Go', result.placemarks);
      }
    })
    this.scheduleUpdate(this.queryInfo.config.updateInterval);
  },

  scheduleUpdate: function(delay){
    var nextLoad = this.queryInfo.config.initialLoadDelay;
    if (typeof delay !== "undefined" && delay >= 0) {
      nextLoad = delay;
    }

    var self = this;
    clearTimeout(this.updateTimer);
    this.updateTimer = setTimeout(function() {
      self.queryCars();
    }, nextLoad);
  }
});
