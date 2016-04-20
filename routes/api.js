var express = require('express');
var router = express.Router();
var phantom = require('phantom');
var crypto = require('crypto');
var md5sum = crypto.createHash('md5');
var fs = fs = require('fs');

var sitePage = null;
var phInstance = null;
var tasks = [];

phantom.create()
    .then(function(instance) {
        phInstance = instance;
        return phInstance.createPage();
    })
    .then(function(page) {
        sitePage = page;
        return sitePage.open('http://localhost:3000');
    })
    .then(function(status) {
        if (status == 'fail') {
            console.log(status);
            sitePage.close();
            phInstance.exit();
        }
    })
    .catch(function(error) {
        console.log(error);
        phInstance.exit();
    });

router.get('/tasks', function(req, res, next) {
    res.send(tasks);
});

router.post('/tasks', function(req, res, next) {
    var url = req.body.url;
    var hash = md5sum.update(name).digest('hex');
    if (hash) {
        tasks.push({url: url});
        res.status(204).send();
    }
});

router.get('/urls', function(req, res, next) {

});

module.exports = router;
