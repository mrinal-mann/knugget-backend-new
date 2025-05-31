"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SummaryStatus = exports.UserPlan = exports.MAX_PAGE_SIZE = exports.DEFAULT_PAGE_SIZE = exports.MAX_SUMMARY_HISTORY = exports.MAX_TRANSCRIPT_LENGTH = void 0;
exports.MAX_TRANSCRIPT_LENGTH = 50000;
exports.MAX_SUMMARY_HISTORY = 100;
exports.DEFAULT_PAGE_SIZE = 20;
exports.MAX_PAGE_SIZE = 100;
var client_1 = require("@prisma/client");
Object.defineProperty(exports, "UserPlan", { enumerable: true, get: function () { return client_1.UserPlan; } });
Object.defineProperty(exports, "SummaryStatus", { enumerable: true, get: function () { return client_1.SummaryStatus; } });
//# sourceMappingURL=index.js.map