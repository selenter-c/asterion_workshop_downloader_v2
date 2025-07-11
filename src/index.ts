import "dotenv/config"
import Server from "./structures/Server"

import logger, { process_error } from "./utils/Logger"

async function start_application() {
    logger.info("Starting application...")

    process_error(logger) // log errors

    const server = new Server()

    const port : number = Number(process.env.PORT) || 1030
    await server.build(port)
}

void start_application()

if (typeof global.gc !== "function") {
    logger.warn("Garbage collector is not exposed. Run with --expose-gc flag")
}

setInterval(() => {
    if (typeof global.gc === "function") {
        global.gc()
    }
}, 300_000).unref()