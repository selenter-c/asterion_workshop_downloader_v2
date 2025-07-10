import { Request, Response } from "express"
import Server from "../structures/Server"
import logger from "../utils/Logger"

export enum CODES {
    SUCCESS = 200,
    BAD_REQUEST = 400,
    UNAUTHORIZED = 401,
    NOT_FOUND = 404,
    SERVER_ERROR = 500,
    FORBIDDEN = 403,
    NOT_ACCEPTABLE = 406,
    TOO_MANY_REQUESTS = 429,
    GONE = 410,
    LENGTH_REQUIRED = 411,
    PRECONDITION_FAILED = 412,
    PAYLOAD_TOO_LARGE = 413,
    REQUEST_URI_TOO_LONG = 414,
    UNSUPPORTED_MEDIA_TYPE = 415,
    REQUESTED_RANGE_NOT_SATISFIABLE = 416,
    EXPECTATION_FAILED = 417,
    IM_USED = 423
}

export default abstract class ServerResponse {
    public constructor(public readonly server: Server) {}

    public abstract action(request : Request, response : Response) : any

    public async log(req: Request) {
        logger.info(`[express/request] ${req.method} ${req.originalUrl} in ${req.ip} — (${req.get("User-Agent")})`)
    }

    public async get(url : string): Promise<void> {
        this.server.app.get(url, async (req: Request, res: Response) => {
            try {
                this.log(req)

                await this.action(req, res)
            } catch (error) {
                this.handleError(error, req, res)
            }
        })

        logger.info(`[express/handler] Loaded ${url} to method GET`)
    }

    public async post(url : string): Promise<void> {
        this.server.app.post(url, async (req: Request, res: Response) => {
            try {
                this.log(req)

                await this.action(req, res)
            } catch (error) {
                this.handleError(error, req, res)
            }
        })

        logger.info(`[express/handler] Loaded ${url} to method POST`)
    }

    private handleError(error: Error, req: Request, res: Response) {
        logger.error(`[${this.constructor.name}] Error: ${error.message}`, { 
            url: req.originalUrl,
            stack: error.stack 
        })

        res.status(CODES.SERVER_ERROR).send({
            code: CODES.SERVER_ERROR,
            message: "Internal Server Error"
        })
    }
}