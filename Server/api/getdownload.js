const { pathExists, isFile, isPathAbs } = require("../misc/randomfuncs")
const { randomBytes } = require('crypto')

const sqlite3 = require('sqlite3').verbose()

module.exports = function ( req, res, emitter ) {
    if (req.body["session_key"] && req.body["file"] && typeof req.body["session_key"] === "string" && typeof req.body["file"] === "string") {

        // Username and Password are sent and of type Strings

        // Database checks
        var db = new sqlite3.Database('records.db')
        db.all(`SELECT permissions.folders_unallowed, sessions.user_id
        FROM sessions JOIN permissions ON permissions.user_id = sessions.user_id 
        WHERE current_session_key = ?`, req.body["session_key"], (_, r1)=> {

            // Session Key does not exist
            if (r1.length === 0) {
                res.status(400).send("SKEY_X")
                return
            }

            // Session Key exists and correct
            let unallowed_dirs = JSON.parse(r1[0].folders_unallowed)

            // correcting dir format for windows
            if (process.platform == 'win32') {
                for (var i=0; i<unallowed_dirs.length; i++) {
                    unallowed_dirs[i] = unallowed_dirs[i].replace(/\//g, "\\")
                }
            }

            // Path must be absolute
            if (!isPathAbs(req.body["file"])) {
                res.status(400).send("PATH_NOT_ABS")
                return
            }

            // Given is not a file
            if (!isFile(req.body["file"])) {
                res.status(400).send("FILE_DNE")
            }

            // Given file is inside an unallowed dir
            for (var i=0; i<unallowed_dirs.length; i++) {
                if (req.body["file"].includes(unallowed_dirs[i])) {
                    res.status(400).send("FILE_DNE")
                    return
                }
            }

            // File has no existence really
            if (!pathExists(req.body["file"])) {
                res.status(400).send("FILE_DNE")
                return
            }
            
            // Generate Key
            let key = randomBytes(10).toString('hex')

            db.all(`INSERT INTO download_keys(key, by_user, file) VALUES (?, ?, ?)`,[
                key,
                r1[0].user_id,
                req.body["file"]
            ], (err) => {
                if (!err)
                    res.status(200).send({
                        "token": key
                    })
                else
                    res.status(500).send("SERVER_ERR")
            })

        })

    } else {
        // Data not sent
        res.status(400).send("DATA_X")
    }
}