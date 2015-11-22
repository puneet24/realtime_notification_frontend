var appbase = new Appbase({
  url: 'https://scalr.api.appbase.io',
  appname: 'testgsoc',
  username: 'JxGrCcfHZ',
  password: '1c46a541-98fa-404c-ad61-d41571a82e14'
});

var NotificationPanel = React.createClass({
  getInitialState : function() {
    return {minage : -1,maxage : -1,appversion_no : -1,country : null,message : null};
  },
  saveMinage : function(event) {
    this.setState({ minage : event.target.value });
  },
  saveMaxage : function(event) {
    this.setState({ maxage : event.target.value });
  },
  saveAppversionno : function(event) {
    this.setState({ appversion_no : event.target.value });
  },
  saveCountry : function(event) {
    this.setState({ country : event.target.value });
  },
  saveMessage : function(event) {
    this.setState({ message : event.target.value });
  },
  sendNotification : function() {
    var notificationobj = this;
    console.log(notificationobj.state);
    appbase.search({
      type: "client",
      body: {
        "query": {
          "filtered": {
            "query" : {
                "bool" : {
                  "should" : [
                    { "match" : {"appversion_no" : notificationobj.state.appversion_no}},
                    { "match" : {"country" : notificationobj.state.country}}
                  ],
                  "minimum_should_match" : 2
                }
            },
            "filter": {
                  "range" : {
                    "age" : {
                      "lte" : notificationobj.state.maxage,
                      "gte" : notificationobj.state.minage
                    }
                  }
            }
          }
        }
      }
    }).on('data', function(res) {
      console.log(res);
      for(var i=0;i<res.hits.total;i++){
        var dates = new Date();
        appbase.index({
          type: 'notification',
          body: { "clientid" : res.hits.hits[i]._id, "message" : notificationobj.state.message,"timestamp" : dates.toISOString() }
        }).on('data', function(response) {
          console.log(response);
        }).on('error', function(error) {
          console.log(error);
        });
      }
    }).on('error', function(err) {
      console.log("search error: ", err);
    });

    appbase.searchStream({
      type: 'client',
      body: {
        "query": {
          "filtered": {
            "query" : {
                "bool" : {
                  "should" : [
                    { "match" : {"appversion_no" : notificationobj.state.appversion_no}},
                    { "match" : {"country" : notificationobj.state.country}}
                  ],
                  "minimum_should_match" : 2
                }
            },
            "filter": {
                  "range" : {
                    "age" : {
                      "lte" : notificationobj.state.maxage,
                      "gte" : notificationobj.state.minage
                    }
                  }
            }
          }
        }
      }
    }).on('data', function(response) {
      console.log(response);
      var date = new Date();
      appbase.index({
        type: 'notification',
        body: { "clientid" : response._id, "message" : notificationobj.state.message,"timestamp" : date.toISOString() }
      }).on('data', function(response) {
        console.log(response);
      }).on('error', function(error) {
        console.log(error);
      });
    }).on('error', function(error) {
      console.log("getStream() failed with: ", error)
    });
  },
  render : function() {
    return (
      <div>
        <b>Min Age : </b>
        <input key={'minage'} onChange={this.saveMinage} value={this.state.minage}></input><br/>
        <b>Max Age : </b>
        <input key={'maxage'} onChange={this.saveMaxage} value={this.state.maxage}></input><br/>
        <b>App Version : </b>
        <input key={'appversion_no'} onChange={this.saveAppversionno} value={this.state.appversion_no}></input><br/>
       <b>Country : </b>
        <input key={'country'} onChange={this.saveCountry} value={this.state.country}></input><br/>
        <b>Message : </b>
        <input key={'message'} onChange={this.saveMessage} value={this.state.message}></input><br/>
        <button onClick={this.sendNotification}>Send Notification</button>
      </div>
    );
  }
});

/* 
  Client React element. 
  Properties :- clientinfo (It accepts clientinfo attribute having associated client details).
  Display :- It shows client details, and all associated notification messages. If new notification
             arrives, it updates the DOM realtime.
 */
var Client = React.createClass({
  getInitialState : function() {
    return {age : 20,appversion_no : 1,location : 'INDIA',msglist : []};
  },
  componentWillMount : function() {
    var clientobj = this;
    var clientinfo = this.props.clientinfo;
    var clientid = this.props.clientid;
    appbase.search({
      type: "notification",
      body: {
        query: {
          "match" : { "clientid" : clientid }
        }
      }
    }).on('data', function(res) {
      for(var i=0;i<res.hits.total;i++){
        var obj = {"msg" : res.hits.hits[i]._source.message,"timestamp" : res.hits.hits[i]._source.timestamp};
        clientobj.setState({msglist : clientobj.state.msglist.concat([obj])});
      }
    }).on('error', function(err) {
      console.log("search error: ", err);
    });
    appbase.searchStream({
      type: 'notification',
      body: {
        "query": {
          "match" : { "clientid" : clientid }
        }
      }
    }).on('data', function(response) {
      var obj = {"msg" : response._source.message,"timestamp" : response._source.timestamp};
      clientobj.setState({ msglist : clientobj.state.msglist.concat([obj]) });
    }).on('error', function(error) {
      console.log("getStream() failed with: ", error)
    });
  },
  render : function() {
    var clientobj = this;
    var clientid = this.props.clientid;
    return (
      <div>
      <p>Client details</p>
      <p>clientid : {clientid}, age : {this.props.clientinfo.age}, appversio_no : {this.props.clientinfo.appversion_no}, country : {this.props.clientinfo.country}</p>
      <b><p id = {clientid}>{this.props.clientinfo.nickname} {this.state.msglist.length}</p></b>
      <div className={"well"}>
        {
          this.state.msglist.map(function(msg){
            return (
              <div><span key={msg.msg}>{msg.msg} </span><time className="timeago" dateTime={msg.timestamp}></time></div>
            )
          })
        }
      </div>
      </div>
    );
  }
});

var Addclient = React.createClass({
  getInitialState : function() {
    return {clientinfo : [],nickname : "XYZ",age : 20,appversion_no : 1,country : 'INDIA'};
  },
  addclient : function() {
    var stateobj = this.state;
    console.log(stateobj);
    appbase.index({
      type: 'client',
      body: { "nickname" : stateobj.nickname,"age" : stateobj.age, "appversion_no" : stateobj.appversion_no, "country" : stateobj.country }
    }).on('data', function(response) {
        console.log(response);
    }).on('error', function(error) {
        console.log(error);
    });
  },
  removeclient : function(event) {
    var newarray = this.state.clientinfo;
    appbase.search({
      type: "notification",
      body: {
        query: {
          "match" : { "clientid" : event.target.id }
        }
      }
    }).on('data', function(res) {
      for(var i=0;i<res.hits.total;i++){
        appbase.delete({
          type: 'notification',
          id : res.hits.hits[i]._id
        }).on('data', function(res) {
          console.log("successfully deleted: ", res);
        }).on('error', function(err) {
          console.log("deletion error: ", err);
        });
      }
    }).on('error', function(err) {
      console.log("search error: ", err);
    });
    /* finding index */
    var index = -1;
    for(var i = 0;i<newarray.length;i++){
      if(newarray[i]._id == event.target.id){
        index = i;
        break;
      }
    }
    newarray.splice(index,1);
    this.setState({ clientinfo : newarray });
    appbase.delete({
      type: 'client',
      id : event.target.id
    }).on('data', function(res) {
      console.log("successfully deleted: ", res);
    }).on('error', function(err) {
      console.log("deletion error: ", err);
    });
  },
  saveNickname : function(event) {
    this.setState({ nickname : event.target.value });
  },
  saveAge : function(event) {
    this.setState({ age : event.target.value });
  },
  saveAppversionno : function(event) {
    this.setState({ appversion_no : event.target.value });
  },
  saveCountry : function(event) {
    this.setState({ country : event.target.value });
  },
  componentWillMount : function() {
    var addclientobj = this;
    appbase.search({
      type: "client",
      body: {
        query: {
          match_all: {}
        }
      }
    }).on('data', function(res) {
      console.log(res);
      for(var i=0;i<res.hits.total;i++){
        console.log(res.hits.hits[i]._source);
        var obj = {_id : res.hits.hits[i]._id,_source : res.hits.hits[i]._source};
        addclientobj.setState({clientinfo : addclientobj.state.clientinfo.concat([obj])});
      }
    }).on('error', function(err) {
      console.log("dwuhduwhduhw");
      console.log("search error: ", err);
    });
  },
  componentDidMount : function() {
    var addclientobj = this;
    appbase.searchStream({
      type: "client",
      body: {
        query: {
          match_all: {}
        }
      }
    }).on('data', function(res) {
      if(res._deleted != true) {
        var obj = {_id : res._id,_source : res._source};
        addclientobj.setState({clientinfo : addclientobj.state.clientinfo.concat([obj])});
      }
    }).on('error', function(err) {
      console.log("search error: ", err);
    });
  },
  render : function() {
    var addclientobj = this;
    
    return (
      <div>
        <input key={'name'} onChange={this.saveNickname} value={this.state.nickname}></input>
        <input key={'age'} onChange={this.saveAge} value={this.state.age}></input>
        <input key={'appversionno'} onChange={this.saveAppversionno} value={this.state.appversion_no}></input>
        <input key={'country'} onChange={this.saveCountry} value={this.state.country}></input>
        <p><b>JSON OBJECT</b> name  {this.state.nickname}, age {this.state.age}, appversion_no  {this.state.appversion_no}, country  {this.state.country} </p>
        <button onClick={this.addclient}>Add Client</button>
        {
          this.state.clientinfo.map(function(client){
            return (
              <div className="well">
              <Client key={client._id+"client"} clientinfo={client._source} clientid = {client._id} />
              <button  id={client._id} key={client._id} onClick={addclientobj.removeclient}>Delete Client</button>
              </div>
            )
          })
        }
      </div>
    );
  }
});


ReactDOM.render(
  <Addclient />,
  document.getElementById('client_panel')
);

ReactDOM.render(
  <NotificationPanel />,
  document.getElementById('notification_panel')
);