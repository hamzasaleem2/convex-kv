import { defineApp } from "convex/server";
import convexKv from "../../src/component/convex.config.js";

const app = defineApp();
app.use(convexKv);

export default app;
