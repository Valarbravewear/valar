/* =========================================================
   VALAR CUSTOMER STORE
   SUPABASE + ONEKHUSA PAYMENT VERSION
========================================================= */

let products = [];

let cart = JSON.parse(
  localStorage.getItem("valarCart") || "[]"
);

let selectedCategory = "All";


/* =========================================================
   CONFIGURATION
========================================================= */

const CREATE_PAYMENT_FUNCTION =
  "https://ppjhtybunodezwwufxia.supabase.co/functions/v1/create-payment";


/* =========================================================
   MONEY FORMAT
========================================================= */

function money(value) {

  return (
    "MWK " +
    Number(value || 0).toLocaleString("en-US")
  );

}


/* =========================================================
   HTML ESCAPE
========================================================= */

function escapeHtml(value) {

  return String(value ?? "").replace(
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
   PRODUCT IMAGE
========================================================= */

function productImage(product) {

  const imageUrl =
    String(product.image_url || "").trim();


  if (imageUrl) {

    return `
      <img
        src="${escapeHtml(imageUrl)}"
        alt="${escapeHtml(
          product.name || "VALAR product"
        )}"
        loading="lazy"
        onerror="this.onerror=null;this.style.display='none';this.parentElement.classList.add('image-error');"
      >
    `;

  }


  return `
    <div class="placeholder">
      ${escapeHtml(
        (product.name || "VALAR")
          .split(" ")[0]
      )}
    </div>
  `;

}


/* =========================================================
   LOAD PRODUCTS
========================================================= */

async function loadProducts() {

  const grid =
    document.getElementById("productGrid");


  if (!grid) {
    return;
  }


  if (!window.valarSupabase) {

    grid.innerHTML = `
      <div class="loading">
        Store connection is not configured.
      </div>
    `;

    return;
  }


  grid.innerHTML = `
    <div class="loading">
      Loading the collection…
    </div>
  `;


  try {

    const {
      data,
      error
    } =
      await window.valarSupabase
        .from("products")
        .select("*")
        .eq("active", true)
        .order(
          "created_at",
          {
            ascending: false
          }
        );


    if (error) {

      console.error(
        "Supabase products error:",
        error
      );


      grid.innerHTML = `
        <div class="loading">
          Unable to load the collection right now.
        </div>
      `;

      return;
    }


    products =
      Array.isArray(data)
        ? data
        : [];


    cart =
      cart.filter(item => {

        const product =
          products.find(
            product =>
              String(product.id) ===
              String(item.id)
          );


        return (
          product &&
          Number(product.stock) > 0
        );

      });


    saveCart(false);

    renderFilters();

    renderProducts();

    renderCart();

  }

  catch (error) {

    console.error(
      "VALAR store error:",
      error
    );


    grid.innerHTML = `
      <div class="loading">
        Unable to connect to the VALAR store.
      </div>
    `;

  }

}


/* =========================================================
   PRODUCT FILTERS
========================================================= */

function renderFilters() {

  const filters =
    document.getElementById("filters");


  if (!filters) {
    return;
  }


  const categories = [
    "All",
    ...new Set(
      products
        .map(
          product =>
            product.category
        )
        .filter(Boolean)
    )
  ];


  if (!products.length) {

    filters.innerHTML = "";

    return;
  }


  filters.innerHTML =
    categories
      .map(category => {

        const active =
          category === selectedCategory
            ? "active"
            : "";


        return `
          <button
            class="filter ${active}"
            type="button"
            data-category="${escapeHtml(category)}"
          >
            ${escapeHtml(category)}
          </button>
        `;

      })
      .join("");


  document
    .querySelectorAll(".filter")
    .forEach(button => {

      button.addEventListener(
        "click",
        function () {

          selectedCategory =
            this.dataset.category;

          renderFilters();

          renderProducts();

        }
      );

    });

}


/* =========================================================
   RENDER PRODUCTS
========================================================= */

function renderProducts() {

  const grid =
    document.getElementById("productGrid");


  if (!grid) {
    return;
  }


  const list =
    selectedCategory === "All"
      ? products
      : products.filter(
          product =>
            product.category ===
            selectedCategory
        );


  if (!list.length) {

    grid.innerHTML = `
      <div class="loading">
        No products available right now.
      </div>
    `;

    return;
  }


  grid.innerHTML =
    list
      .map(product => {

        const soldOut =
          Number(product.stock) <= 0;


        return `
          <article
            class="product-card"
            data-product-id="${escapeHtml(product.id)}"
          >

            <div class="product-photo">
              ${productImage(product)}
            </div>


            <div class="product-info">

              <h3>
                ${escapeHtml(product.name)}
              </h3>


              <div class="product-meta">

                <span>
                  ${escapeHtml(
                    product.category || ""
                  )}
                </span>


                <strong class="price">
                  ${money(product.price)}
                </strong>

              </div>


              <button
                class="add"
                type="button"
                ${soldOut ? "disabled" : ""}
                onclick="addToCart('${escapeHtml(product.id)}')"
              >
                ${
                  soldOut
                    ? "SOLD OUT"
                    : "ADD TO CART"
                }
              </button>

            </div>

          </article>
        `;

      })
      .join("");

}


/* =========================================================
   ADD TO CART
========================================================= */

function addToCart(id) {

  const product =
    products.find(
      item =>
        String(item.id) ===
        String(id)
    );


  if (!product) {
    return;
  }


  if (Number(product.stock) <= 0) {

    alert(
      "This product is currently sold out."
    );

    return;
  }


  const existing =
    cart.find(
      item =>
        String(item.id) ===
        String(id)
    );


  if (existing) {

    if (
      existing.qty <
      Number(product.stock)
    ) {

      existing.qty++;

    }

    else {

      alert(
        "You cannot add more than the available stock."
      );

      return;
    }

  }

  else {

    cart.push({

      id:
        product.id,

      qty:
        1,

      size:
        Array.isArray(product.sizes)
          ? product.sizes[0] || ""
          : "",

      color:
        Array.isArray(product.colors)
          ? product.colors[0] || ""
          : ""

    });

  }


  saveCart();

  openCart();

}


/* =========================================================
   SAVE CART
========================================================= */

function saveCart(render = true) {

  localStorage.setItem(
    "valarCart",
    JSON.stringify(cart)
  );


  if (render) {
    renderCart();
  }

}


/* =========================================================
   REMOVE FROM CART
========================================================= */

function removeFromCart(id) {

  cart =
    cart.filter(
      item =>
        String(item.id) !==
        String(id)
    );


  saveCart();

}


/* =========================================================
   CHANGE QUANTITY
========================================================= */

function changeQty(id, amount) {

  const item =
    cart.find(
      cartItem =>
        String(cartItem.id) ===
        String(id)
    );


  const product =
    products.find(
      product =>
        String(product.id) ===
        String(id)
    );


  if (!item || !product) {
    return;
  }


  const newQuantity =
    item.qty + amount;


  if (newQuantity <= 0) {

    removeFromCart(id);

    return;
  }


  if (
    newQuantity >
    Number(product.stock)
  ) {

    alert(
      "You have reached the available stock."
    );

    return;
  }


  item.qty =
    newQuantity;


  saveCart();

}


/* =========================================================
   CART TOTAL
========================================================= */

function cartTotal() {

  return cart.reduce(
    (total, item) => {

      const product =
        products.find(
          product =>
            String(product.id) ===
            String(item.id)
        );


      if (!product) {
        return total;
      }


      return (
        total +
        Number(product.price || 0) *
        Number(item.qty || 0)
      );

    },
    0
  );

}


/* =========================================================
   RENDER CART
========================================================= */

function renderCart() {

  const cartCount =
    document.getElementById("cartCount");

  const cartTotalElement =
    document.getElementById("cartTotal");

  const checkoutTotal =
    document.getElementById("checkoutTotal");

  const cartItems =
    document.getElementById("cartItems");


  if (
    !cartCount ||
    !cartTotalElement ||
    !checkoutTotal ||
    !cartItems
  ) {
    return;
  }


  const count =
    cart.reduce(
      (total, item) =>
        total +
        Number(item.qty || 0),
      0
    );


  cartCount.textContent =
    count;


  cartTotalElement.textContent =
    money(cartTotal());


  checkoutTotal.textContent =
    money(cartTotal());


  if (!cart.length) {

    cartItems.innerHTML = `
      <div class="empty">
        Your cart is empty.
      </div>
    `;

    return;
  }


  cartItems.innerHTML =
    cart
      .map(item => {

        const product =
          products.find(
            product =>
              String(product.id) ===
              String(item.id)
          );


        if (!product) {
          return "";
        }


        const photo =
          product.image_url
            ? `
              <img
                src="${escapeHtml(product.image_url)}"
                alt="${escapeHtml(product.name)}"
                loading="lazy"
              >
            `
            : escapeHtml(
                (product.name || "V")
                  .charAt(0)
              );


        return `
          <div class="cart-item">

            <div class="mini-photo">
              ${photo}
            </div>


            <div>

              <h4>
                ${escapeHtml(product.name)}
              </h4>


              <small>
                ${money(product.price)}
                ×
                ${item.qty}
              </small>


              <br>


              <button
                class="remove"
                type="button"
                onclick="removeFromCart('${escapeHtml(product.id)}')"
              >
                Remove
              </button>

            </div>


            <div class="qty">

              <button
                type="button"
                onclick="changeQty('${escapeHtml(product.id)}', -1)"
                aria-label="Decrease quantity"
              >
                −
              </button>


              <strong>
                ${item.qty}
              </strong>


              <button
                type="button"
                onclick="changeQty('${escapeHtml(product.id)}', 1)"
                aria-label="Increase quantity"
              >
                +
              </button>

            </div>

          </div>
        `;

      })
      .join("");

}


/* =========================================================
   CART OPEN/CLOSE
========================================================= */

function openCart() {

  document
    .getElementById("cartDrawer")
    ?.classList.add("show");

  document
    .getElementById("drawerBackdrop")
    ?.classList.add("show");

}


function closeCart() {

  document
    .getElementById("cartDrawer")
    ?.classList.remove("show");

  document
    .getElementById("drawerBackdrop")
    ?.classList.remove("show");

}


document
  .getElementById("openCart")
  ?.addEventListener(
    "click",
    openCart
  );


document
  .getElementById("closeCart")
  ?.addEventListener(
    "click",
    closeCart
  );


document
  .getElementById("drawerBackdrop")
  ?.addEventListener(
    "click",
    closeCart
  );


/* =========================================================
   CHECKOUT
========================================================= */

const checkoutBackdrop =
  document.getElementById(
    "checkoutBackdrop"
  );


function openCheckout() {

  if (!cart.length) {

    alert(
      "Your cart is empty."
    );

    return;
  }


  document
    .getElementById("checkoutTotal")
    ?.replaceChildren(
      document.createTextNode(
        money(cartTotal())
      )
    );


  closeCart();

  checkoutBackdrop?.classList.add("show");

}


function closeCheckout() {

  checkoutBackdrop?.classList.remove("show");

}


document
  .getElementById("checkoutButton")
  ?.addEventListener(
    "click",
    openCheckout
  );


document
  .getElementById("closeCheckout")
  ?.addEventListener(
    "click",
    closeCheckout
  );


checkoutBackdrop?.addEventListener(
  "click",
  event => {

    if (
      event.target ===
      checkoutBackdrop
    ) {

      closeCheckout();

    }

  }
);


/* =========================================================
   PAYMENT UI
========================================================= */

const paymentMethod =
  document.getElementById(
    "paymentMethod"
  );

const paymentInstructions =
  document.getElementById(
    "paymentInstructions"
  );

const paymentTitle =
  document.getElementById(
    "paymentTitle"
  );

const paymentText =
  document.getElementById(
    "paymentText"
  );

const mobileMoneyFields =
  document.getElementById(
    "mobileMoneyFields"
  );

const mobileMoneyPhone =
  document.getElementById(
    "mobileMoneyPhone"
  );


function updatePaymentInstructions() {

  const method =
    paymentMethod?.value || "";


  const mobile =
    method === "Airtel Money" ||
    method === "Mpamba";


  if (mobileMoneyFields) {

    mobileMoneyFields.hidden =
      !mobile;

  }


  if (mobileMoneyPhone) {

    mobileMoneyPhone.required =
      mobile;

  }


  if (!paymentInstructions) {
    return;
  }


  if (method === "Airtel Money") {

    paymentInstructions.hidden =
      false;

    paymentTitle.textContent =
      "Airtel Money";

    paymentText.textContent =
      "After placing your order, VALAR will generate your OneKhusa payment request.";

  }

  else if (method === "Mpamba") {

    paymentInstructions.hidden =
      false;

    paymentTitle.textContent =
      "TNM Mpamba";

    paymentText.textContent =
      "After placing your order, VALAR will generate your OneKhusa payment request.";

  }

  else if (
    method ===
    "Cash on delivery / pickup"
  ) {

    paymentInstructions.hidden =
      false;

    paymentTitle.textContent =
      "Cash payment";

    paymentText.textContent =
      "Pay cash when your order is delivered or when you collect it.";

  }

  else if (
    method ===
    "Visa Card"
  ) {

    paymentInstructions.hidden =
      false;

    paymentTitle.textContent =
      "Visa Card";

    paymentText.textContent =
      "Online Visa Card payment is not connected yet. Please choose Airtel Money, TNM Mpamba, or cash.";

  }

  else {

    paymentInstructions.hidden =
      true;

  }

}


paymentMethod?.addEventListener(
  "change",
  updatePaymentInstructions
);


/* =========================================================
   CREATE ORDER
========================================================= */

async function createValarOrder({

  customerName,
  phone,
  location,
  payment,
  total

}) {

  const orderNumber =
    "VALAR-" +
    Date.now()
      .toString()
      .slice(-8);


  const paymentStatus =
    payment ===
      "Cash on delivery / pickup"
      ? "cash_pending"
      : "pending";


  const order = {

    order_number:
      orderNumber,

    customer_name:
      customerName,

    phone:
      phone,

    delivery_location:
      location,

    payment_method:
      payment,

    payment_status:
      paymentStatus,

    payment_provider:
      (
        payment === "Airtel Money" ||
        payment === "Mpamba"
      )
        ? "OneKhusa"
        : null,

    total:
      total

  };


  const {
    data: createdOrder,
    error: orderError
  } =
    await window.valarSupabase
      .from("orders")
      .insert(order)
      .select()
      .single();


  if (orderError) {

    console.error(
      "Order creation error:",
      orderError
    );

    throw new Error(
      "ORDER_CREATE_FAILED"
    );

  }


  const orderItems =
    cart.map(item => {

      const product =
        products.find(
          product =>
            String(product.id) ===
            String(item.id)
        );


      return {

        order_id:
          createdOrder.id,

        product_id:
          product.id,

        product_name:
          product.name,

        quantity:
          Number(item.qty),

        unit_price:
          Number(product.price),

        size:
          item.size || "",

        color:
          item.color || "",

        line_total:
          Number(product.price) *
          Number(item.qty)

      };

    });


  const {
    error: itemError
  } =
    await window.valarSupabase
      .from("order_items")
      .insert(orderItems);


  if (itemError) {

    console.error(
      "Order items error:",
      itemError
    );


    await window.valarSupabase
      .from("orders")
      .delete()
      .eq(
        "id",
        createdOrder.id
      );


    throw new Error(
      "ITEM_CREATE_FAILED"
    );

  }


  return createdOrder;

}


/* =========================================================
   START ONEKHUSA PAYMENT
========================================================= */

async function startOneKhusaPayment(
  orderNumber
) {

  console.log(
    "Starting OneKhusa payment:",
    orderNumber
  );


  const response =
    await fetch(
      CREATE_PAYMENT_FUNCTION,
      {

        method:
          "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body:
          JSON.stringify({
            orderNumber:
              orderNumber
          })

      }
    );


  const responseText =
    await response.text();


  let result;

  try {

    result =
      JSON.parse(
        responseText
      );

  }

  catch {

    console.error(
      "Invalid create-payment response:",
      responseText
    );

    throw new Error(
      "PAYMENT_FUNCTION_INVALID_RESPONSE"
    );

  }


  console.log(
    "OneKhusa response:",
    result
  );


  if (
    !response.ok ||
    !result.success
  ) {

    throw new Error(
      result.error ||
      "PAYMENT_INITIALIZATION_FAILED"
    );

  }


  if (
    !result.timedAccountNumber
  ) {

    throw new Error(
      "OneKhusa did not return a payment number."
    );

  }


  return result;

}


/* =========================================================
   SHOW ORDER RESULT
========================================================= */

function showOrderResult(
  orderNumber,
  message
) {

  const orderResult =
    document.getElementById(
      "orderResult"
    );


  if (!orderResult) {
    return;
  }


  orderResult.innerHTML = `

    <strong>
      Order ${escapeHtml(orderNumber)}
    </strong>

    <br>

    ${escapeHtml(message)}

  `;

}


/* =========================================================
   SHOW ONEKHUSA PAYMENT DETAILS
========================================================= */

function showOneKhusaPayment(
  orderNumber,
  result
) {

  const orderResult =
    document.getElementById(
      "orderResult"
    );


  if (!orderResult) {
    return;
  }


  const tan =
    result.timedAccountNumber;


  const expiry =
    result.expiryInMinutes ||
    15;


  orderResult.innerHTML = `

    <strong>
      Order ${escapeHtml(orderNumber)}
    </strong>

    <p>
      Your OneKhusa payment request has been created.
    </p>

    <div class="payment-instructions">

      <strong>
        OneKhusa Payment Number
      </strong>

      <p
        style="
          font-size:1.35rem;
          font-weight:800;
          letter-spacing:1px;
          margin:10px 0;
        "
      >
        ${escapeHtml(tan)}
      </p>

      <p>
        Use this payment number to complete your
        ${escapeHtml(
          paymentMethod?.value || "mobile money"
        )}
        payment.
      </p>

      <p>
        This payment request expires in approximately
        ${escapeHtml(expiry)}
        minutes.
      </p>

      <p>
        Keep your order number:
        <strong>
          ${escapeHtml(orderNumber)}
        </strong>
      </p>

    </div>

  `;

}


/* =========================================================
   PLACE ORDER
========================================================= */

const checkoutForm =
  document.getElementById(
    "checkoutForm"
  );


checkoutForm?.addEventListener(
  "submit",
  async function (event) {

    event.preventDefault();


    if (!window.valarSupabase) {

      alert(
        "The VALAR store is not connected to Supabase."
      );

      return;
    }


    if (!cart.length) {

      alert(
        "Your cart is empty."
      );

      return;
    }


    /* -----------------------------------------------------
       STOCK CHECK
    ----------------------------------------------------- */

    const validCart =
      cart.filter(item => {

        const product =
          products.find(
            product =>
              String(product.id) ===
              String(item.id)
          );


        return (
          product &&
          Number(product.stock) >=
            Number(item.qty)
        );

      });


    if (
      validCart.length !==
      cart.length
    ) {

      alert(
        "One or more products in your cart are no longer available. Please review your cart."
      );


      cart =
        validCart;


      saveCart();

      return;
    }


    /* -----------------------------------------------------
       FORM DATA
    ----------------------------------------------------- */

    const formData =
      new FormData(this);


    const customerName =
      String(
        formData.get("name") || ""
      ).trim();


    const phone =
      String(
        formData.get("phone") || ""
      ).trim();


    const location =
      String(
        formData.get("location") || ""
      ).trim();


    const payment =
      String(
        formData.get("payment") || ""
      ).trim();


    const mobileNumber =
      String(
        formData.get(
          "mobileMoneyPhone"
        ) || ""
      ).trim();


    if (
      !customerName ||
      !phone ||
      !location ||
      !payment
    ) {

      alert(
        "Please complete all checkout fields."
      );

      return;
    }


    /* -----------------------------------------------------
       VISA
    ----------------------------------------------------- */

    if (
      payment ===
      "Visa Card"
    ) {

      alert(
        "Visa Card payment is not connected yet. Please choose Airtel Money, TNM Mpamba, or Cash on delivery / pickup."
      );

      return;
    }


    /* -----------------------------------------------------
       MOBILE MONEY NUMBER
    ----------------------------------------------------- */

    if (
      (
        payment === "Airtel Money" ||
        payment === "Mpamba"
      ) &&
      !mobileNumber
    ) {

      alert(
        "Please enter your mobile-money number."
      );

      return;
    }


    const total =
      cartTotal();


    if (
      !Number.isFinite(total) ||
      total <= 0
    ) {

      alert(
        "Your order total is invalid."
      );

      return;
    }


    const submitButton =
      this.querySelector(
        'button[type="submit"]'
      );


    if (submitButton) {

      submitButton.disabled =
        true;

      submitButton.textContent =
        (
          payment === "Airtel Money" ||
          payment === "Mpamba"
        )
          ? "STARTING PAYMENT..."
          : "PLACING ORDER...";

    }


    try {

      /* ---------------------------------------------------
         CREATE ORDER
      --------------------------------------------------- */

      const createdOrder =
        await createValarOrder({

          customerName:
            customerName,

          phone:
            phone,

          location:
            location,

          payment:
            payment,

          total:
            total

        });


      const orderNumber =
        createdOrder.order_number;


      /* ---------------------------------------------------
         MOBILE MONEY
      --------------------------------------------------- */

      if (
        payment === "Airtel Money" ||
        payment === "Mpamba"
      ) {

        showOrderResult(
          orderNumber,
          "Creating your secure OneKhusa payment request..."
        );


        try {

          const paymentResult =
            await startOneKhusaPayment(
              orderNumber
            );


          localStorage.setItem(
            "valarPendingPaymentOrder",
            orderNumber
          );


          showOneKhusaPayment(
            orderNumber,
            paymentResult
          );


          /*
             We intentionally DO NOT clear the cart yet.
             The order is still pending until OneKhusa
             confirms successful payment.
          */

          return;

        }

        catch (paymentError) {

          console.error(
            "OneKhusa start error:",
            paymentError
          );


          alert(
            "Your order was created, but we could not start the OneKhusa payment. Please keep your order number: " +
            orderNumber
          );


          showOrderResult(
            orderNumber,
            "Payment could not be started. Keep this order number and contact VALAR."
          );


          return;

        }

      }


      /* ---------------------------------------------------
         CASH
      --------------------------------------------------- */

      if (
        payment ===
        "Cash on delivery / pickup"
      ) {

        showOrderResult(
          orderNumber,
          "Pay cash when your order is delivered or collected."
        );


        cart = [];

        saveCart();


        this.reset();

        updatePaymentInstructions();

        closeCheckout();


        alert(
          "Order " +
          orderNumber +
          " received. Please keep this number for reference."
        );


        return;

      }

    }

    catch (error) {

      console.error(
        "VALAR checkout error:",
        error
      );


      alert(
        "We could not place your order. Please try again."
      );

    }

    finally {

      if (submitButton) {

        submitButton.disabled =
          false;

        submitButton.textContent =
          "PLACE ORDER";

      }

    }

  }
);


/* =========================================================
   CURRENT YEAR
========================================================= */

const yearElement =
  document.getElementById(
    "year"
  );


if (yearElement) {

  yearElement.textContent =
    new Date().getFullYear();

}


/* =========================================================
   INITIAL PAYMENT UI
========================================================= */

updatePaymentInstructions();


/* =========================================================
   INITIALIZE STORE
========================================================= */

loadProducts();