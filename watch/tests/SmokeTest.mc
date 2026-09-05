import Toybox.Lang;
import Toybox.Test;

//! Trivially true assertion — proves the test harness reports passes.
(:test)
function smokeTestTrue(logger as Test.Logger) as Boolean {
    logger.debug("2 + 2 = " + (2 + 2));
    return (2 + 2 == 4);
}

//! Was deliberately false to prove the harness reports failures (confirmed:
//! it printed FAIL for this test while smokeTestTrue printed PASS). Now
//! corrected to the true assertion.
(:test)
function smokeTestArithmetic(logger as Test.Logger) as Boolean {
    var x = 2 + 3;
    logger.debug("x = " + x);
    return (x == 5);
}
