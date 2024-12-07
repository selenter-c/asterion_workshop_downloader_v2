import { Request, Response } from "express"
import ServerResponse, { CODES } from "../utils/ServerResponse"

export default class Ping extends ServerResponse {
    public async action(req: Request, res: Response) {
        res.status(CODES.SUCCESS).send({
            code: CODES.SUCCESS,
            message: "Successfully"
        })
    }
}