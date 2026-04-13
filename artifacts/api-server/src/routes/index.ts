import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import toolsRouter from "./tools";
import planningsRouter from "./plannings";
import logsRouter from "./logs";
import accountsRouter from "./accountsrouter";
import statsRouter from "./stats";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(toolsRouter);
router.use(planningsRouter);
router.use(logsRouter);
router.use(accountsRouter);
router.use(statsRouter);

export default router;
