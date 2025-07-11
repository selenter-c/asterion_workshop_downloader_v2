import { Request, Response } from "express"
import ServerResponse, { CODES } from "../utils/ServerResponse"
import SteamCmd from "../structures/SteamCmd"
import logger from "../utils/Logger"
import { promises } from "fs"

export default class Downloader extends ServerResponse {
    public async action(req: Request, res: Response) {
        if (!req.body) return res.status(400).send({
            code: 400,
            message: "Bad Request"
        })

        const token : string = req.body.token
        if (token !== process.env.TOKEN) return res.status(CODES.UNAUTHORIZED).send({
            code: CODES.UNAUTHORIZED,
            message: "Unauthorized"
        })

        const id : number = req.body.id
        if (!id) return res.status(CODES.BAD_REQUEST).send({
            code: CODES.BAD_REQUEST,
            message: "Bad Request"
        })

        const ip : string = req.body.ip
        if (!ip) return res.status(CODES.BAD_REQUEST).send({
            code: CODES.BAD_REQUEST,
            message: "Bad Request"
        })

        // SUCCESS
        res.status(CODES.SUCCESS).send({
            code: CODES.SUCCESS,
            message: "Success"
        })

        const steamCmd = new SteamCmd({
            platform: "linux"
        })


        try {
            const cachePath = steamCmd.get_cache_path(id);

            try {
                await promises.rm(cachePath, { recursive: true, force: true })

                logger.info(`[downloader] Cleared cache for ${id}`)
            } catch (error) {}

            await steamCmd.install(id)
            await steamCmd.gma_extract(id)

            logger.info(`[downloader] Successfully install and extract addon ${id}`)
        } catch (error) {
            logger.error(`[downloader] Failed to process ${id}: ${error.message}`)
        }
    }
}