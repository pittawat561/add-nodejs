const express = require('express');
const path = require('path');
const cookieSession = require('cookie-session');
const bcrypt = require('bcrypt');
const dbConnection = require('./database');
const { body, validationResult } = require('express-validator');

const app = express();

app.use('/bootstrap', 
    express.static(__dirname + '/node_modules/bootstrap/dist'))

app.use(express.urlencoded({ extended: false }));

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(cookieSession({
    name: 'session',
    keys: ['key1', 'key2'],
    maxAge: 3600 * 1000 // 1hr
}));

const ifNotLoggedin = (req, res, next) => {
    if (!req.session.isLoggedIn) {
        return res.render('login-register');
    }
    next();
}
const ifLoggedin = (req, res, next) => {
    if (req.session.isLoggedIn) {
        return res.redirect('/home');
    }
    next();
}

app.get('/', ifNotLoggedin, (req, res, next) => {
    dbConnection.execute("SELECT * FROM `users` WHERE `id`=?", [req.session.userID])
        .then(([rows]) => {
            res.render('home', {
                name: rows[0].name,
                email: rows[0].email
            });
        });

});

app.post('/register', ifLoggedin,
    [
        body('user_email', 'อีเมลไม่ถูกต้อง!').isEmail().custom((value) => {
            return dbConnection.execute('SELECT `email` FROM `users` WHERE `email`=?', [value])
                .then(([rows]) => {
                    if (rows.length > 0) {
                        return Promise.reject('อีเมลนี้ถูกใช้งานแล้ว!');
                    }
                    return true;
                });
        }),
        body('user_name', 'ไม่พบผู้ใช้!').trim().not().isEmpty(),
        body('user_pass', 'รหัสผ่านต้องมีความยาวไม่ต่ำกว่า 6 ตัวอักษร').trim().isLength({ min: 6 }),
    ], (req, res, next) => {

        const validation_result = validationResult(req);
        const { user_name, user_pass, user_email } = req.body;
        if (validation_result.isEmpty()) {
            bcrypt.hash(user_pass, 12).then((hash_pass) => {
                dbConnection.execute("INSERT INTO `users`(`name`,`email`,`password`) VALUES(?,?,?)", [user_name, user_email, hash_pass])
                    .then(result => {
                        res.send(`สร้างบัญชีของคุณสำเร็จแล้ว, ตอนนี้คุณสามารถ <a href="/">Login</a>`);
                    }).catch(err => {
                        if (err) throw err;
                    });
            })
                .catch(err => {
                    if (err) throw err;
                })
        } else {
            let allErrors = validation_result.errors.map((error) => {
                return error.msg;
            });
            res.render('login-register', {
                register_error: allErrors,
                old_data: req.body
            });
        }
    });

app.post('/', ifLoggedin, [
    body('user_email').custom((value) => {
        return dbConnection.execute('SELECT email FROM users WHERE email=?', [value])
            .then(([rows]) => {
                if (rows.length == 1) {
                    return true;

                }
                return Promise.reject('ที่อยู่อีเมลที่ไม่ถูกต้อง!');

            });
    }),
    body('user_pass', 'รหัสผ่านไม่ถูกต้อง!').trim().not().isEmpty(),
], (req, res) => {
    const validation_result = validationResult(req);
    const { user_pass, user_email } = req.body;
    if (validation_result.isEmpty()) {

        dbConnection.execute("SELECT * FROM `users` WHERE `email`=?", [user_email])
            .then(([rows]) => {
                bcrypt.compare(user_pass, rows[0].password).then(compare_result => {
                    if (compare_result === true) {
                        req.session.isLoggedIn = true;
                        req.session.userID = rows[0].id;

                        res.redirect('/');
                    }
                    else {
                        res.render('login-register', {
                            login_errors: ['รหัสผ่านไม่ถูกต้อง!']
                        });
                    }
                })
                    .catch(err => {
                        if (err) throw err;
                    });


            }).catch(err => {
                if (err) throw err;
            });
    }
    else {
        let allErrors = validation_result.errors.map((error) => {
            return error.msg;
        });
        res.render('login-register', {
            login_errors: allErrors
        });
    }
});

app.get('/calculator', (req, res) => {
    res.render('calculator')
});

app.get('/logout', (req, res) => {
    //session destroy
    req.session = null;
    res.redirect('/');
});

app.use('/', (req, res) => {
    res.status(404).send('<h1>404 Page Not Found!</h1>');
});



app.listen(3000, () => console.log("Server is Running..."));