/*~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 ______    ______    ______   __  __    __    ______
 /\  == \  /\  __ \  /\__  _\ /\ \/ /   /\ \  /\__  _\
 \ \  __<  \ \ \/\ \ \/_/\ \/ \ \  _"-. \ \ \ \/_/\ \/
 \ \_____\ \ \_____\   \ \_\  \ \_\ \_\ \ \_\   \ \_\
 \/_____/  \/_____/    \/_/   \/_/\/_/  \/_/    \/_/


 This is a sample Slack Button application that provides a custom
 Slash command.

 This bot demonstrates many of the core features of Botkit:

 *
 * Authenticate users with Slack using OAuth
 * Receive messages using the slash_command event
 * Reply to Slash command both publicly and privately

 # RUN THE BOT:

 Create a Slack app. Make sure to configure at least one Slash command!

 -> https://api.slack.com/applications/new

 Run your bot from the command line:

 clientId=<my client id> clientSecret=<my client secret> PORT=3000 node bot.js

 Note: you can test your oauth authentication locally, but to use Slash commands
 in Slack, the app must be hosted at a publicly reachable IP or host.


 # EXTEND THE BOT:

 Botkit is has many features for building cool and useful bots!

 Read all about it here:

 -> http://howdy.ai/botkit

 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/

/* Uses the slack button feature to offer a real time bot to multiple teams */
var Botkit = require('botkit');
var Https = require('https');
var Moment = require('moment-timezone');
var BeepBoop = require('beepboop-botkit');

// if (!process.env.CLIENT_ID || !process.env.CLIENT_SECRET || !process.env.PORT || !process.env.VERIFY_TOKEN) {
//     console.log('Error: Specified CLIENT_ID:'+ process.env.CLIENT_ID +', CLIENT_SECRET:' + process.env.CLIENT_SECRET + ', VERIFY_TOKEN:' + process.env.VERIFY_TOKEN + ', PORT:' + process.env.PORT + 'in environment');
//     process.exit(1);
// }

var config = {}
if (process.env.MONGOLAB_URI) {
    var BotkitStorage = require('botkit-storage-mongo');
    config = {
        storage: BotkitStorage({mongoUri: process.env.MONGOLAB_URI}),
    };
} else {
    config = {
        json_file_store: './db_slackbutton_slash_command/',
    };
}

config.debug = true;
config.logLevel = 7;
retry: Infinity;

// var controller = Botkit.slackbot(config).configureSlackApp(
//     {
//         // clientId: process.env.CLIENT_ID,
//         // clientSecret: process.env.CLIENT_SECRET,
//         scopes: ['commands','bot'],
//     }
// );

var controller = Botkit.slackbot(config);

var beepboop = BeepBoop.start(controller, { debug: true });

controller.setupWebserver(process.env.PORT, function (err, webserver) {
    controller.createWebhookEndpoints(controller.webserver);

    // controller.createOauthEndpoints(controller.webserver, function (err, req, res) {
    //     if (err) {
    //         res.status(500).send('ERROR: ' + err);
    //     } else {
    //         res.send('Success!');
    //     }
    // });
});


//
// BEGIN EDITING HERE!
//

// var _bots = {};
// function trackBot(bot) {
//   _bots[bot.config.token] = bot;
// }

// controller.on('create_bot',function(bot,config) {

//   if (_bots[bot.config.token]) {
//     // already online! do nothing.
//     console.log("Bot is online!");
//   } else {
//     bot.startRTM(function(err) {

//       if (!err) {
//         trackBot(bot);
//       }

//       bot.startPrivateConversation({user: config.createdBy},function(err,convo) {
//         if (err) {
//           console.log(err);
//         } else {
//           convo.say('I am a bot that has just joined your team');
//           convo.say('You must now /invite me to a channel so that I can be of use!');
//         }
//       });

//     });
//   }

// });

// // Handle events related to the websocket connection to Slack
// controller.on('rtm_open',function(bot) {
//   console.log('** The RTM api just connected!');
// });

// controller.on('rtm_close',function(bot) {
//   console.log('** The RTM api just closed');
//   // you may want to attempt to re-open
// });

// controller.storage.teams.all(function(err,teams) {

//   if (err) {
//     throw new Error(err);
//   }

//   console.log("Teams:", teams);
//   // connect all teams with bots up to slack!
//   for (var t  in teams) {
//     if (teams[t].bot) {
//       controller.spawn(teams[t]).startRTM(function(err, bot) {
//         if (err) {
//           console.log('Error connecting bot to Slack:',err);
//         } else {
//           trackBot(bot);
//         }
//       });
//     }
//   }

// });

controller.on('slash_command', function (slashCommand, message) {

    switch (message.command) {
        case "/cats": 
            
            // but first, let's make sure the token matches!
            if (message.token !== process.env.VERIFICATION_TOKEN) return; //just ignore it.

            var text = message.text.trim().split(" ");
            switch (text[0]) {
                case "help":
                    slashCommand.replyPrivate(message,
                        "I can help you forget the pain around Cats :)" +
                        "\nTry typing `/cats login <username> <password>` to login" +
                        "\nTry typing `/cats add <date in format YYYYMMDD> <order> <sub-order> <hours> <comment>` to book time");
                    break;

                case "login":
                    if (!text[1] || !text[2]) {
                        slashCommand.replyPrivate(message, "I'm afraid you cant login without passing in your credentials");
                        break;
                    }
                    var incomingUserName = text[1];
                    var incomingPassword = text[2];
                    var loginSuccess = true;
                    slashCommand.replyPrivate(message, "Attempting to login", function() {
                        loginSuccess = performLogin(slashCommand, message, incomingUserName, incomingPassword);
                    });

                    break;

                case "add":
                    var addTimeSuccess = true;
                    slashCommand.replyPrivate(message, "Attempting to add your hours to cats..", function() {
                        controller.storage.users.get(message.user, function(err, user) {
                            if (user && user.userName && user.password) {
                                var returnStatusCode = performLogin(slashCommand, message, user.userName, user.password);
                                if (returnStatusCode === 200) {
                                    var comment = "";
                                    for (var i = 5; i < text.length; i++) {
                                        comment += text[i] + " ";
                                    };
                                    if (!text[1] || moment(text[1], "YYYYMMDD", true).isValid() || !text[2] || !text[3] || !text[4] || !comment) {
                                        slashCommand.replyPrivateDelayed(message, "Please pass data in the form of <date in format YYYYMMDD> <order> <sub-order> <hours> <comment> ");
                                        addTimeSuccess = false;
                                    }
                                    else {
                                        var incomingDate = text[1];
                                        var incomingOrder = text[2];
                                        var incomingSuborder = text[2] + "-" + text[3];
                                        var incomingHours = text[4];
                                        var formattedComment = comment.substring(0,50);
                                        var postTimeSuccess = true;
                                        slashCommand.replyPrivateDelayed(message, "Attempting to add your time", function() {
                                            controller.storage.users.get(message.user, function(err, user) {
                                                postTimeSuccess = performPostTime(slashCommand, message, incomingDate, incomingOrder, incomingSuborder, incomingHours, formattedComment, user.sid, user.defaultActivity);
                                            });
                                        });
                                    }
                                }
                                else {
                                    console.log("User:", user);
                                    slashCommand.replyPrivateDelayed(message, "I do not have your right credentials to login, Try typing `/cats login <username> <password>` to login");
                                }
                            }
                            else {
                                console.log("User:", user);
                                slashCommand.replyPrivateDelayed(message, "I do not have your credentials to login, Try typing `/cats login <username> <password>` to login");
                            }

                        });
                    });
                    

                    break;

                default:
                    slashCommand.replyPublic(message, "I'm afraid I don't know how to " + message.command + " yet.");
            }   

            break;
        default:
            slashCommand.replyPublic(message, "I'm afraid I don't know how to " + message.command + " yet.");

    }

});

beepboop.on('add_resource', function (msg) {
  console.log('received request to add bot to team')
});

// Send the user who added the bot to their team a welcome message the first time it's connected
beepboop.on('botkit.rtm.started', function (bot, resource, meta) {
  var slackUserId = resource.SlackUserID

  if (meta.isNew && slackUserId) {
    console.log("inside botkit.rtm.started: meta..isNew")
    bot.api.im.open({ user: slackUserId }, function (err, response) {
      if (err) {
        return console.log("im.open error:",err)
      }
      var dmChannel = response.channel.id
      bot.say({channel: dmChannel, text: 'Thanks for adding me to your team!'})
      bot.say({channel: dmChannel, text: 'Just /invite me to a channel!'})
    })
  }
});

controller.on('bot_channel_join', function (bot, message) {
    console.log("bot_channel_join")
  bot.reply(message, "I'm here!")
});

controller.hears(['hello', 'hi'], ['direct_mention'], function (bot, message) {
  bot.reply(message, 'Hello.')
});

// controller.hears(['hello', 'hi'], ['direct_message'], function (bot, message) {
//   bot.reply(message, 'Hello.')
//   bot.reply(message, 'It\'s nice to talk to you directly.')
// });

// controller.hears('.*', ['mention'], function (bot, message) {
//   bot.reply(message, 'You really do care about me. :heart:')
// });

controller.hears('help', ['direct_message', 'direct_mention'], function (bot, message) {
  var help = 'I will respond to the following messages: \n' +
      '`bot hi` for a simple message.\n' +
      '`@<your bot\'s name>` to demonstrate detecting a mention.\n' +
      '`bot help` to see this again.'
  bot.reply(message, help)
});

// controller.hears(['attachment'], ['direct_message', 'direct_mention'], function (bot, message) {
//   var text = 'Beep Beep Boop is a ridiculously simple hosting platform for your Slackbots.'
//   var attachments = [{
//     fallback: text,
//     pretext: 'We bring bots to life. :sunglasses: :thumbsup:',
//     title: 'Host, deploy and share your bot in seconds.',
//     image_url: 'https://storage.googleapis.com/beepboophq/_assets/bot-1.22f6fb.png',
//     title_link: 'https://beepboophq.com/',
//     text: text,
//     color: '#7CD197'
//   }]

//   bot.reply(message, {
//     attachments: attachments
//   }, function (err, resp) {
//     console.log(err, resp)
//   })
// })

controller.hears('.*', ['direct_message', 'direct_mention'], function (bot, message) {
  bot.reply(message, 'Sorry <@' + message.user + '>, I don\'t understand. \n')
});

function getCurrentTimestamp() {
    var current = Moment().format("YYYYMMDD HH:mm:ss");
    console.log("Current:", current);
    var timezoneid = Moment.tz.guess();
    console.log("timezoneid:", timezoneid);
    console.log("currentDateTime:", current + " " + timezoneid);
    return current + " " + timezoneid;
}

function performPostTime(slashCommand, message, incomingDate, incomingOrder, incomingSuborder, incomingHours, formattedComment, incomingSid, incomingDefaultActivity) {
    var options = {
        host: 'cats.arvato-systems.de',
        path: '/gui4cats-webapi/api/times',
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json; charset=utf-8',
            'Timestamp': getCurrentTimestamp(),
            'Consumer-Id': 'CATSmobile-client',
            'Consumer-Key': 'C736938F-02FC-4804-ACFE-00E20E21D198',
            'Version': '1.0',
            'Connection': 'keep-alive',
            'User-Agent': 'Mozilla/5.0',
            'x-fallback-origin': 'https://mobilecats.arvato-systems.de',
            'Cache-Control': 'no-cache',
            'Accept-Language': 'en',
            'sid': incomingSid
            }
    };

    console.log("Start Add time POST Request");

    var req = Https.request(options, function(res) {
        res.on('data',function(data){
            var jsonData = JSON.parse(data);
            console.log("JsonData:", jsonData);
            httpstatus = jsonData.httpstatus;
            switch (httpstatus) {
                case 201:
                    slashCommand.replyPrivateDelayed(message, "Cats entry was successful..");
                    break;

                case 400:
                    slashCommand.replyPrivateDelayed(message, jsonData.details);
                    break;

                default:
                    console.log("HttpsStatus:", httpstatus);

            }
        });
    });
    req.on('error', (e) => {
        console.error("Error:", e);
        slashCommand.replyPrivateDelayed(message, "something went wrong :(");
        return false;;
    });

    req.write('{"date":"'+incomingDate+'","workingHours":"'+incomingHours+'","comment":"'+formattedComment+'","orderid":"'+incomingOrder+'","suborderid":"'+incomingSuborder+'","activityid":"'+incomingDefaultActivity+'"}');
    req.end();

}

function performLogin(slashCommand, message, incomingUserName, incomingPassword) {
    var httpstatus = null;
    var sid = null;
    var firstName = null;
    var lastName = null;
    var defaultActivity = null;
    var options = {
        host: 'cats.arvato-systems.de',
        path: '/gui4cats-webapi/api/users',
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json; charset=utf-8',
            'User': incomingUserName,
            'Password': incomingPassword,
            'Timestamp': getCurrentTimestamp(),
            'Consumer-Id': 'CATSmobile-client',
            'Consumer-Key': 'C736938F-02FC-4804-ACFE-00E20E21D198',
            'Version': '1.0',
            'Connection': 'keep-alive',
            'User-Agent': 'Mozilla/5.0',
            'x-fallback-origin': 'https://mobilecats.arvato-systems.de',
            'Cache-Control': 'no-cache',
            'Accept-Language': 'en'
        }
    };

    console.log("Start Login get Request");
    var req = Https.request(options, function(res) {
        res.on('data',function(data){
            var jsonData = JSON.parse(data);
            console.log("JsonData:", jsonData);
            httpstatus = jsonData.httpstatus;
            switch (httpstatus) {
                case 200 :
                    sid = jsonData.meta.sid;
                    lastName = jsonData.name;
                    firstName = jsonData.prename;
                    defaultActivity = jsonData.defaultActivity;
                    console.log("HttpsStatus was of type 200 :)");
                    if (!defaultActivity) {
                        slashCommand.replyPrivateDelayed(message, "You do not have defaultActivity set, please contact Cats Admin.");
                    };
                    controller.storage.users.get(message.user, function(err, user) {

                        if (!user) {
                            user = {
                                id: message.user
                            }
                        }

                        user.userName = incomingUserName;
                        user.password = incomingPassword;
                        user.firstName = firstName;
                        user.lastName = lastName;
                        user.sid = sid;
                        user.defaultActivity = defaultActivity;

                        controller.storage.users.save(user);

                    });

                    slashCommand.replyPrivateDelayed(message, firstName + " " + lastName + " you have successfully logged-in & your creds have been saved");
                    break;

                case 401 :
                    slashCommand.replyPrivateDelayed(message, jsonData.message);
                    break;

                default:
                    console.log("HttpsStatus:", httpstatus);
                    slashCommand.replyPrivateDelayed(message, "could not login for some reason = " + jsonData.message);

            }
            return httpstatus;
        });
    });
    req.on('error', (e) => {
        console.error("Error:", e);
        slashCommand.replyPrivateDelayed(message, "something went wrong :(");
    });
    req.end();
}
