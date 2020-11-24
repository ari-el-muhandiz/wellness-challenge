require('dotenv').config()
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
const moment = require('moment');

var app = express();

// connect mongodb
const MongoClient = require('mongodb').MongoClient;
// mongo atlas free tier for demo purposes
const uri = process.env.DB_URI;
const client = new MongoClient(uri, { useNewUrlParser: true,  useUnifiedTopology: true });

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);
  
client.connect(err => {
  if (err) return console.error(err)
  console.log('Connected to Database');
  
  const db = client.db("demo_wellness");
  // here to get total user
  app.get('/userView', async (req, res) => {
    const pipeline = [
      {
        '$group': {
          '_id': '$UserId', 
          'totalUser': {
            '$sum': 1
          }
        }
      }, {
        '$count': 'total_users'
      }
    ]
    const aggCursor = db.collection('userView').aggregate(pipeline);
    const resp = [];
    await aggCursor.forEach(userViewListing => {
      resp.push(userViewListing);
    });
    res.json(resp);
  })
  
  // here to get total uniq user who viewed product 
  app.get('/userView/:productId', async (req, res) => {
    const productId = req.params.productId;
    const filterDate = req.query.filterDate;
    // date query based on filter(daily, weekly, monthly, custom date)
    const pipeline =[
      {
        '$match': {
          'ProductId': productId,
          ...(filterDate === 'daily' && { 'ViewDate': moment().startOf('day').toDate() }),
          ...(filterDate === 'weekly' && { 'ViewDate': {
              $lte:moment().endOf('week').toDate(),
              $gte: moment().startOf('week').toDate()
            }
          }),
          ...(filterDate === 'monthly' && { 'ViewDate': {
              $lte:moment().endOf('month').toDate(),
              $gte: moment().startOf('month').toDate()
            }
          }),
          ...(/([12]\d{3}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01]))/.test(filterDate) && { 
            'ViewDate': moment(filterDate).startOf('day').toDate() 
          })
        }
      }, {
        '$group': {
          '_id': '$UserId'
        }
      },
      {
        '$count': 'total_users'
      }
    ]
   console.log(moment().startOf('month').toDate());
   console.log(moment().endOf('month').toDate())
    const aggCursor = db.collection('userView').aggregate(pipeline);
    const resp = [];
    await aggCursor.forEach(userViewListing => {
      resp.push(userViewListing);
    });
    res.json(resp);
  })
  // catch 404 and forward to error handler
  app.use(function(req, res, next) {
    next(createError(404));
  });

  // error handler
  app.use(function(err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
  });
});

module.exports = app;
