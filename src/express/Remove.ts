import { Request, Response } from "express"
import ServerResponse from "../utils/ServerResponse"

export default class Remove extends ServerResponse {
    public async action(req: Request, res: Response) {
        // res.send("Express + TypeScript Server")
    }
}