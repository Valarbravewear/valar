/* =========================================================
   VALAR ADMIN LOGIN
   SUPABASE AUTHENTICATION
========================================================= */


/* =========================================================
   AUTHORIZED VALAR ADMIN EMAILS
========================================================= */

const VALAR_ADMIN_EMAILS = [
  "mejaalex33@gmail.com",
  "mercydrainagecuthanasia@gmail.com"
];


/* =========================================================
   CHECK ADMIN EMAIL
========================================================= */

function isValarAdmin(email) {

  const normalizedEmail =
    String(email || "")
      .trim()
      .toLowerCase();

  return VALAR_ADMIN_EMAILS.includes(
    normalizedEmail
  );
}


/* =========================================================
   LOGIN PAGE
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    const form =
      document.getElementById("loginForm");

    const msg =
      document.getElementById("loginMsg");

    const submitButton =
      form
        ? form.querySelector(
            'button[type="submit"]'
          )
        : null;


    /* =====================================================
       CHECK FORM
    ===================================================== */

    if (!form || !msg) {

      console.error(
        "VALAR ERROR: Login form not found."
      );

      return;
    }


    /* =====================================================
       CHECK SUPABASE
    ===================================================== */

    if (!window.valarSupabase) {

      console.error(
        "VALAR ERROR: Supabase client is not available."
      );

      msg.textContent =
        "Supabase connection is unavailable. Check config.js.";

      return;
    }


    console.log(
      "VALAR login page connected to Supabase."
    );


    /* =====================================================
       LOGIN SUBMIT
    ===================================================== */

    form.addEventListener(
      "submit",
      async (event) => {

        event.preventDefault();


        /* =================================================
           BUTTON STATE
        ================================================= */

        msg.textContent =
          "Signing in…";


        if (submitButton) {

          submitButton.disabled =
            true;

          submitButton.textContent =
            "SIGNING IN…";
        }


        try {

          /* ===============================================
             GET FORM DATA
          =============================================== */

          const formData =
            new FormData(form);


          const email =
            String(
              formData.get("email") || ""
            )
              .trim()
              .toLowerCase();


          const password =
            String(
              formData.get("password") || ""
            );


          /* ===============================================
             VALIDATE INPUT
          =============================================== */

          if (!email) {

            msg.textContent =
              "Please enter your admin email.";

            return;
          }


          if (!password) {

            msg.textContent =
              "Please enter your password.";

            return;
          }


          /* ===============================================
             CHECK AUTHORIZED EMAIL
          =============================================== */

          if (!isValarAdmin(email)) {

            msg.textContent =
              "This email is not authorized to access VALAR Admin.";

            return;
          }


          console.log(
            "VALAR login attempt:",
            email
          );


          /* ===============================================
             SIGN IN WITH SUPABASE
          =============================================== */

          const result =
            await window.valarSupabase
              .auth
              .signInWithPassword({
                email: email,
                password: password
              });


          const data =
            result.data;

          const error =
            result.error;


          /* ===============================================
             SUPABASE ERROR
          =============================================== */

          if (error) {

            console.error(
              "VALAR Supabase login error:",
              error
            );


            if (
              error.message
                .toLowerCase()
                .includes("invalid login credentials")
            ) {

              msg.textContent =
                "Invalid email or password. Check the Supabase Auth account.";

            }

            else {

              msg.textContent =
                error.message ||
                "Unable to sign in.";
            }


            return;
          }


          /* ===============================================
             VERIFY USER
          =============================================== */

          if (
            !data ||
            !data.user
          ) {

            msg.textContent =
              "Login failed. Supabase did not return a user.";

            return;
          }


          /* ===============================================
             VERIFY SESSION
          =============================================== */

          if (!data.session) {

            msg.textContent =
              "Login failed. No active session was created.";

            return;
          }


          /* ===============================================
             VERIFY ACTUAL EMAIL
          =============================================== */

          const loggedInEmail =
            String(
              data.user.email || ""
            )
              .trim()
              .toLowerCase();


          if (!isValarAdmin(loggedInEmail)) {

            console.warn(
              "Unauthorized VALAR account:",
              loggedInEmail
            );


            await window.valarSupabase
              .auth
              .signOut();


            msg.textContent =
              "This account is not authorized to access VALAR Admin.";

            return;
          }


          /* ===============================================
             SUCCESS
          =============================================== */

          console.log(
            "VALAR login successful:",
            loggedInEmail
          );


          msg.classList.remove("error");
msg.classList.add("success");

msg.textContent =
  "Login successful. Opening valar adminitration page…";


          /* ===============================================
             OPEN ADMIN DASHBOARD
          =============================================== */

          window.location.href =
            "admin.html";
        }


        /* =================================================
           UNEXPECTED ERROR
        ================================================= */

        catch (error) {

          console.error(
            "VALAR unexpected login error:",
            error
          );


          msg.textContent =
            error.message ||
            "Something went wrong. Please try again.";
        }


        /* =================================================
           RESTORE BUTTON
        ================================================= */

        finally {

          if (submitButton) {

            submitButton.disabled =
              false;

            submitButton.textContent =
              "LOGIN";
          }
        }

      }
    );

  }
);
const passwordInput = document.getElementById("password");
const passwordToggle = document.getElementById("passwordToggle");

passwordToggle.addEventListener("click", function () {

  if (passwordInput.type === "password") {

    // SHOW PASSWORD
    passwordInput.type = "text";

    passwordToggle.classList.add("showing");

    passwordToggle.setAttribute(
      "aria-label",
      "Hide password"
    );

  } else {

    // HIDE PASSWORD
    passwordInput.type = "password";

    passwordToggle.classList.remove("showing");

    passwordToggle.setAttribute(
      "aria-label",
      "Show password"
    );

  }

});