import chalk from 'chalk';
import { NextFunction, Request, Response } from 'express';

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const method = req.method;
    const url = req.originalUrl;
    const status = res.statusCode;

    // Colorize status code
    let statusColor = chalk.green;
    if (status >= 500) {
      statusColor = chalk.red;
    } else if (status >= 400) {
      statusColor = chalk.yellow;
    } else if (status >= 300) {
      statusColor = chalk.cyan;
    }

    // Colorize method
    let methodColor = chalk.blue;
    if (method === 'GET') methodColor = chalk.bgBlue.white.bold;
    else if (method === 'POST') methodColor = chalk.bgGreen.white.bold;
    else if (method === 'PUT' || method === 'PATCH') methodColor = chalk.bgYellow.black.bold;
    else if (method === 'DELETE') methodColor = chalk.bgRed.white.bold;

    console.log(
      `${methodColor(` ${method} `)} ${chalk.gray(url)} ${statusColor(status)} - ${chalk.magenta(`${duration}ms`)}`,
    );
  });

  next();
};
