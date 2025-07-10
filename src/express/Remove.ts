import { Request, Response } from "express"
import ServerResponse, { CODES } from "../utils/ServerResponse"
import logger from "../utils/Logger"
import SteamCmd from "../structures/SteamCmd"

export default class Remove extends ServerResponse {
    public async action(req: Request, res: Response) {
        if (!req.body) return res.status(CODES.BAD_REQUEST).send({
            code: CODES.BAD_REQUEST,
            message: "Bad Request"
        })

        const token: string = req.body.token
        if (token !== process.env.TOKEN) return res.status(CODES.UNAUTHORIZED).send({
            code: CODES.UNAUTHORIZED,
            message: "Unauthorized"
        })

        const id: number = req.body.id
        if (!id) return res.status(CODES.BAD_REQUEST).send({
            code: CODES.BAD_REQUEST,
            message: "Bad Request"
        })

        res.status(CODES.SUCCESS).send({
            code: CODES.SUCCESS,
            message: "Removal started"
        })

        try {
            const steamCmd = new SteamCmd({
                platform: "linux"
            })

            await steamCmd.remove(id)

            logger.info(`[remove] Successfully removed addon ${id}`)
        } catch (error) {
            logger.error(`[remove] Failed to remove ${id}: ${error.message}`)
        }
    }
}