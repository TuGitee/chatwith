const Router = require('koa-router');
const router = new Router();

const HomeRouter=require('./HomeRouter');
const LoginRouter=require('./LoginRouter');
const RegisterRouter=require('./RegisterRouter');
const ApiRouter=require('./ApiRouter');
const ChatRouter=require('./ChatRouter');

router.use("/home", HomeRouter.routes(), HomeRouter.allowedMethods());
router.use("/chat", ChatRouter.routes(), ChatRouter.allowedMethods());
router.use("/login", LoginRouter.routes(), LoginRouter.allowedMethods());
router.use("/register", RegisterRouter.routes(), RegisterRouter.allowedMethods());
router.use("/api", ApiRouter.routes(), ApiRouter.allowedMethods());

module.exports=router;