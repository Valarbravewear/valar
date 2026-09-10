/* =========================================================
   VALAR ADMIN DASHBOARD
   SUPABASE VERSION
========================================================= */

let products = [];
let orders = [];


/* =========================================================
   AUTHORIZED VALAR ADMIN EMAILS
========================================================= */

const ADMIN_EMAILS = [
  "mejaalex33@gmail.com",
  "mercydrainagecuthanasia@gmail.com"
];


/* =========================================================
   MONEY FORMAT
========================================================= */

const money = (n) =>
  "MWK " + Number(n || 0).toLocaleString("en-US");


/* =========================================================
   CHECK ADMIN EMAIL
========================================================= */

function isAdminEmail(email) {

  const normalized =
    String(email || "")
      .trim()
      .toLowerCase();

  return ADMIN_EMAILS
    .map(email => email.toLowerCase())
    .includes(normalized);
}


/* =========================================================
   ADMIN GUARD
========================================================= */

async function guard() {

  if (!window.valarSupabase) {

    alert(
      "Supabase is not configured. Check config.js."
    );

    console.error(
      "window.valarSupabase is missing."
    );

    return false;
  }


  const {
    data,
    error
  } =
    await window.valarSupabase.auth.getSession();


  if (error) {

    console.error(
      "Session error:",
      error
    );

    alert(
      "Unable to check administrator session."
    );

    return false;
  }


  if (
    !data ||
    !data.session ||
    !data.session.user
  ) {

    window.location.href =
      "login.html";

    return false;
  }


  const email =
    String(
      data.session.user.email || ""
    )
      .trim()
      .toLowerCase();


  /* =======================================================
     VERIFY ADMIN
  ======================================================= */

  if (!isAdminEmail(email)) {

    console.warn(
      "Unauthorized VALAR admin access:",
      email
    );


    await window.valarSupabase
      .auth
      .signOut();


    alert(
      "You are not authorized to access the VALAR admin panel."
    );


    window.location.href =
      "login.html";


    return false;
  }


  /* =======================================================
     DISPLAY ADMIN EMAIL
  ======================================================= */

  const emailElement =
    document.getElementById(
      "adminEmail"
    );


  if (emailElement) {

    emailElement.textContent =
      email;
  }


  return true;
}


/* =========================================================
   LOAD DASHBOARD DATA
========================================================= */

async function load() {

  if (!await guard()) {
    return;
  }


  try {

    const [
      productsResult,
      ordersResult
    ] = await Promise.all([

      /* PRODUCTS */

      window.valarSupabase
        .from("products")
        .select("*")
        .order(
          "created_at",
          {
            ascending: false
          }
        ),


      /* ORDERS */

      window.valarSupabase
        .from("orders")
        .select("*")
        .order(
          "created_at",
          {
            ascending: false
          }
        )

    ]);


    /* =====================================================
       PRODUCTS ERROR
    ===================================================== */

    if (productsResult.error) {

      console.error(
        "Products error:",
        productsResult.error
      );

      alert(
        "Unable to load products:\n\n" +
        productsResult.error.message
      );

      return;
    }


    /* =====================================================
       ORDERS ERROR
    ===================================================== */

    if (ordersResult.error) {

      console.error(
        "Orders error:",
        ordersResult.error
      );

      alert(
        "Unable to load orders:\n\n" +
        ordersResult.error.message
      );

      return;
    }


    products =
      productsResult.data || [];


    orders =
      ordersResult.data || [];


    render();


  } catch (error) {

    console.error(
      "Dashboard loading error:",
      error
    );


    alert(
      "Unable to connect to the VALAR database."
    );
  }
}


/* =========================================================
   RENDER DASHBOARD
========================================================= */

function render() {

  const productCount =
    document.getElementById(
      "productCount"
    );


  const orderCount =
    document.getElementById(
      "orderCount"
    );


  const salesTotal =
    document.getElementById(
      "salesTotal"
    );


  /* =======================================================
     COUNTS
  ======================================================= */

  if (productCount) {

    productCount.textContent =
      products.length;
  }


  if (orderCount) {

    orderCount.textContent =
      orders.length;
  }


  /* =======================================================
     SALES
  ======================================================= */

  const sales =
    orders
      .filter(order =>

        order.payment_status === "paid" ||

        order.payment_method ===
          "Cash on delivery / pickup"

      )
      .reduce(

        (sum, order) =>
          sum + Number(order.total || 0),

        0

      );


  if (salesTotal) {

    salesTotal.textContent =
      money(sales);
  }


  /* =======================================================
     PRODUCTS TABLE
  ======================================================= */

  const productsBody =
    document.getElementById(
      "productsBody"
    );


  if (productsBody) {

    productsBody.innerHTML =

      products.map(product => `

        <tr>

          <td>
            ${esc(product.name)}
          </td>

          <td>
            ${esc(product.category)}
          </td>

          <td>
            ${money(product.price)}
          </td>

          <td>
            ${Number(product.stock || 0)}
          </td>

          <td>
            ${product.active ? "Yes" : "No"}
          </td>

          <td class="actions">

            <button
              type="button"
              onclick="editProduct('${product.id}')"
            >
              Edit
            </button>

            <button
              type="button"
              onclick="deleteProduct('${product.id}')"
            >
              Delete
            </button>

          </td>

        </tr>

      `).join("");
  }


  /* =======================================================
     ORDERS TABLE
  ======================================================= */

  const ordersBody =
    document.getElementById(
      "ordersBody"
    );


  if (ordersBody) {

    ordersBody.innerHTML =

      orders
        .slice(0, 30)
        .map(order => `

          <tr>

            <td>
              ${esc(order.order_number)}
            </td>

            <td>

              ${esc(order.customer_name)}

              <br>

              <small>
                ${esc(order.phone)}
              </small>

            </td>

            <td>

              ${esc(order.payment_method)}

              <br>

              <small>
                ${esc(order.payment_status)}
              </small>

            </td>

            <td>
              ${money(order.total)}
            </td>

            <td>

              <select
                onchange="setStatus(
                  '${order.id}',
                  this.value
                )"
              >

                ${
                  [
                    "new",
                    "confirmed",
                    "processing",
                    "ready",
                    "out_for_delivery",
                    "completed",
                    "cancelled"
                  ]

                  .map(status => `

                    <option
                      value="${status}"
                      ${
                        status ===
                        order.order_status
                          ? "selected"
                          : ""
                      }
                    >
                      ${status}
                    </option>

                  `)

                  .join("")
                }

              </select>

            </td>

            <td>

              ${
                order.created_at
                  ? new Date(
                      order.created_at
                    ).toLocaleString()
                  : ""
              }

            </td>

          </tr>

        `)

        .join("");
  }
}


/* =========================================================
   ESCAPE HTML
========================================================= */

function esc(value) {

  return String(value ?? "")
    .replace(
      /[&<>"']/g,
      character => ({

        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"

      }[character])
    );
}


/* =========================================================
   PRODUCT MODAL
========================================================= */

function openModal(product = null) {

  const modal =
    document.getElementById(
      "productModal"
    );


  const title =
    document.getElementById(
      "modalTitle"
    );


  const form =
    document.getElementById(
      "productForm"
    );


  if (!modal || !title || !form) {
    return;
  }


  modal.classList.add("show");


  title.textContent =
    product
      ? "Edit Product"
      : "Add Product";


  form.reset();


  /* =======================================================
     EDIT PRODUCT
  ======================================================= */

  if (product) {

    [
      "id",
      "name",
      "category",
      "price",
      "stock",
      "image_url",
      "description"
    ]

    .forEach(field => {

      if (form.elements[field]) {

        form.elements[field].value =
          product[field] ?? "";
      }

    });


    if (form.elements.sizes) {

      form.elements.sizes.value =
        Array.isArray(product.sizes)
          ? product.sizes.join(", ")
          : "";
    }


    if (form.elements.colors) {

      form.elements.colors.value =
        Array.isArray(product.colors)
          ? product.colors.join(", ")
          : "";
    }


    if (form.elements.active) {

      form.elements.active.checked =
        product.active !== false;
    }


  } else {

    if (form.elements.active) {

      form.elements.active.checked =
        true;
    }
  }
}


/* =========================================================
   CLOSE PRODUCT MODAL
========================================================= */

function closeModal() {

  const modal =
    document.getElementById(
      "productModal"
    );


  if (modal) {

    modal.classList.remove("show");
  }
}


/* =========================================================
   EDIT PRODUCT
========================================================= */

window.editProduct =
  function (id) {

    const product =
      products.find(
        product =>
          product.id === id
      );


    if (product) {

      openModal(product);
    }
  };


/* =========================================================
   DELETE PRODUCT
========================================================= */

window.deleteProduct =
  async function (id) {

    if (
      !confirm(
        "Delete this product?"
      )
    ) {

      return;
    }


    const { error } =
      await window.valarSupabase
        .from("products")
        .delete()
        .eq("id", id);


    if (error) {

      console.error(
        "Delete product error:",
        error
      );


      alert(
        "Unable to delete product:\n\n" +
        error.message
      );


      return;
    }


    await load();
  };


/* =========================================================
   UPDATE ORDER STATUS
========================================================= */

window.setStatus =
  async function (id, status) {

    const { error } =
      await window.valarSupabase
        .from("orders")
        .update({
          order_status: status
        })
        .eq("id", id);


    if (error) {

      console.error(
        "Order status error:",
        error
      );


      alert(
        "Unable to update order:\n\n" +
        error.message
      );


      return;
    }


    await load();
  };


/* =========================================================
   START DASHBOARD
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    /* =====================================================
       NEW PRODUCT
    ===================================================== */

    const newProduct =
      document.getElementById(
        "newProduct"
      );


    if (newProduct) {

      newProduct.addEventListener(
        "click",
        () => openModal()
      );
    }


    /* =====================================================
       CLOSE MODAL
    ===================================================== */

    const closeModalButton =
      document.getElementById(
        "closeModal"
      );


    if (closeModalButton) {

      closeModalButton.addEventListener(
        "click",
        closeModal
      );
    }


    /* =====================================================
       PRODUCT FORM
    ===================================================== */

    const productForm =
      document.getElementById(
        "productForm"
      );


    if (productForm) {

      productForm.addEventListener(
        "submit",
        async function (event) {

          event.preventDefault();


          const form =
            new FormData(event.target);


          const product = {

            name:
              String(
                form.get("name") || ""
              ).trim(),

            category:
              String(
                form.get("category") || ""
              ).trim(),

            price:
              Number(
                form.get("price") || 0
              ),

            stock:
              Number(
                form.get("stock") || 0
              ),

            sizes:
              String(
                form.get("sizes") || ""
              )
              .split(",")
              .map(v => v.trim())
              .filter(Boolean),

            colors:
              String(
                form.get("colors") || ""
              )
              .split(",")
              .map(v => v.trim())
              .filter(Boolean),

            image_url:
              String(
                form.get("image_url") || ""
              ).trim(),

            description:
              String(
                form.get("description") || ""
              ).trim(),

            active:
              form.get("active") === "on"

          };


          const id =
            form.get("id");


          let result;


          /* =================================================
             UPDATE
          ================================================= */

          if (id) {

            result =
              await window.valarSupabase
                .from("products")
                .update(product)
                .eq("id", id);


          /* =================================================
             INSERT
          ================================================= */

          } else {

            result =
              await window.valarSupabase
                .from("products")
                .insert(product);
          }


          if (result.error) {

            console.error(
              "Save product error:",
              result.error
            );


            alert(
              "Unable to save product:\n\n" +
              result.error.message
            );


            return;
          }


          closeModal();

          await load();

        }
      );
    }


    /* =====================================================
       LOGOUT
    ===================================================== */

    const logout =
      document.getElementById(
        "logout"
      );


    if (logout) {

      logout.addEventListener(
        "click",
        async () => {

          await window.valarSupabase
            .auth
            .signOut();


          window.location.href =
            "login.html";
        }
      );
    }


    /* =====================================================
       START
    ===================================================== */

    load();

  }
);