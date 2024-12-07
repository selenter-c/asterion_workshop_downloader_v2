import express from "express"
import { urlencoded } from "body-parser"
import logger from "../utils/Logger"

import Ping from "../express/Ping"
import Downloader from "../express/Downloader"
import Remove from "../express/Remove"

export default class Server {
    public readonly app = express()

    public readonly ping = new Ping(this)
    public readonly downloader = new Downloader(this)
    public readonly remove = new Remove(this)

    public async build(port : number) : Promise<void> {
        this.app.use(urlencoded({
            extended: true
        }))

        this.ping.get("/api/ping")
        this.downloader.post("/api/downloader")
        this.remove.post("/api/remove")

        this.app.listen(port, () => {
            logger.info(`[express] Server is running at http://localhost:${port}`)
        })
    }
}