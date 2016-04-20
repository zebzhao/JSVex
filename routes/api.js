var express = require('express');
var router = express.Router();
var phantom = require('phantom');

var sitepage = null;
var phInstance = null;

phantom.create()
    .then(function(instance) {
        phInstance = instance;
        return phInstance.createPage();
    })
    .then(function(page) {
        sitepage = page;
        return page.open('http://localhost:3000');
    })
    .then(function(status) {
        if (status == 'fail') {
            console.log(status);
            sitepage.close();
            phInstance.exit();
        }
    })
    .catch(function(error) {
        console.log(error);
        phInstance.exit();
    });

router.get('/urls', function(req, res, next) {

});

module.exports = router;
