/* =========================================================
   VALAR CUSTOMER STORE
   SUPABASE + ONEKHUSA PAYMENT VERSION
========================================================= */


/* =========================================================
   STATE
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
   PRODUCT IMAGE HTML
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
   LOAD PRODUCTS FROM SUPABASE
========================================================= */

async function loadProducts() {

  const grid =
    document.getElementById(
      "productGrid"
    );


  if (!grid) {
    return;
  }


  if (!window.valarSupabase) {

    console.error(
      "VALAR Supabase client is not configured."
    );


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


    /*
      Remove products from cart that
      are no longer active/available.
    */

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
    document.getElementById(
      "filters"
    );


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
    document.getElementById(
      "productGrid"
    );


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

        const image =
          productImage(product);


        const soldOut =
          Number(product.stock) <= 0;


        return `
          <article
            class="product-card"
            data-product-id="${escapeHtml(product.id)}"
          >

            <div class="product-photo">

              ${image}

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
    document.getElementById(
      "cartCount"
    );


  const cartTotalElement =
    document.getElementById(
      "cartTotal"
    );


  const checkoutTotal =
    document.getElementById(
      "checkoutTotal"
    );


  const cartItems =
    document.getElementById(
      "cartItems"
    );


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
   OPEN CART
========================================================= */

function openCart() {

  const drawer =
    document.getElementById(
      "cartDrawer"
    );


  const backdrop =
    document.getElementById(
      "drawerBackdrop"
    );


  if (drawer) {
    drawer.classList.add("show");
  }


  if (backdrop) {
    backdrop.classList.add("show");
  }

}


/* =========================================================
   CLOSE CART
========================================================= */

function closeCart() {

  const drawer =
    document.getElementById(
      "cartDrawer"
    );


  const backdrop =
    document.getElementById(
      "drawerBackdrop"
    );


  if (drawer) {
    drawer.classList.remove("show");
  }


  if (backdrop) {
    backdrop.classList.remove("show");
  }

}


/* =========================================================
   CART EVENTS
========================================================= */

const openCartButton =
  document.getElementById(
    "openCart"
  );


const closeCartButton =
  document.getElementById(
    "closeCart"
  );


const drawerBackdrop =
  document.getElementById(
    "drawerBackdrop"
  );


if (openCartButton) {

  openCartButton.addEventListener(
    "click",
    openCart
  );

}


if (closeCartButton) {

  closeCartButton.addEventListener(
    "click",
    closeCart
  );

}


if (drawerBackdrop) {

  drawerBackdrop.addEventListener(
    "click",
    closeCart
  );

}


/* =========================================================
   CHECKOUT
========================================================= */

const checkoutButton =
  document.getElementById(
    "checkoutButton"
  );


const checkoutBackdrop =
  document.getElementById(
    "checkoutBackdrop"
  );


const closeCheckoutButton =
  document.getElementById(
    "closeCheckout"
  );


/* =========================================================
   OPEN CHECKOUT FORM
========================================================= */

function openCheckout() {

  if (!cart.length) {

    alert(
      "Your cart is empty."
    );

    return;
  }


  const checkoutTotal =
    document.getElementById(
      "checkoutTotal"
    );


  if (checkoutTotal) {

    checkoutTotal.textContent =
      money(cartTotal());

  }


  closeCart();


  if (checkoutBackdrop) {

    checkoutBackdrop.classList.add(
      "show"
    );

  }

}


/* =========================================================
   CHECKOUT BUTTON
========================================================= */

if (checkoutButton) {

  checkoutButton.addEventListener(
    "click",
    openCheckout
  );

}


/* =========================================================
   CLOSE CHECKOUT
========================================================= */

function closeCheckout() {

  if (checkoutBackdrop) {

    checkoutBackdrop.classList.remove(
      "show"
    );

  }

}


if (closeCheckoutButton) {

  closeCheckoutButton.addEventListener(
    "click",
    closeCheckout
  );

}


/* =========================================================
   CLOSE WHEN CLICKING OUTSIDE FORM
========================================================= */

if (checkoutBackdrop) {

  checkoutBackdrop.addEventListener(
    "click",
    function (event) {

      if (
        event.target ===
        checkoutBackdrop
      ) {

        closeCheckout();

      }

    }
  );

}


/* =========================================================
   PAYMENT ELEMENTS
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


/* =========================================================
   PAYMENT INSTRUCTIONS
========================================================= */

function updatePaymentInstructions() {

  if (!paymentMethod) {
    return;
  }


  const method =
    paymentMethod.value;


  if (mobileMoneyFields) {

    mobileMoneyFields.hidden =
      !(
        method ===
          "Airtel Money" ||
        method ===
          "Mpamba"
      );

  }


  if (mobileMoneyPhone) {

    mobileMoneyPhone.required =
      (
        method ===
          "Airtel Money" ||
        method ===
          "Mpamba"
      );

  }


  if (!paymentInstructions) {
    return;
  }


  if (method === "Airtel Money") {

    paymentInstructions.hidden =
      false;


    if (paymentTitle) {

      paymentTitle.textContent =
        "Airtel Money";

    }


    if (paymentText) {

      paymentText.textContent =
        "After placing your order, OneKhusa will open a secure payment checkout where you can authorize your Airtel Money payment.";

    }


  }

  else if (method === "Mpamba") {

    paymentInstructions.hidden =
      false;


    if (paymentTitle) {

      paymentTitle.textContent =
        "TNM Mpamba";

    }


    if (paymentText) {

      paymentText.textContent =
        "After placing your order, OneKhusa will open a secure payment checkout where you can authorize your TNM Mpamba payment.";

    }


  }

  else if (
    method ===
    "Cash on delivery / pickup"
  ) {

    paymentInstructions.hidden =
      false;


    if (paymentTitle) {

      paymentTitle.textContent =
        "Cash payment";

    }


    if (paymentText) {

      paymentText.textContent =
        "Pay cash when your order is delivered or when you collect it.";

    }


  }

  else if (
    method ===
    "Visa Card"
  ) {

    paymentInstructions.hidden =
      false;


    if (paymentTitle) {

      paymentTitle.textContent =
        "Visa Card";

    }


    if (paymentText) {

      paymentText.textContent =
        "Online Visa Card payment is not connected yet. Please choose Airtel Money, TNM Mpamba, or cash.";

    }


  }

  else {

    paymentInstructions.hidden =
      true;

  }

}


if (paymentMethod) {

  paymentMethod.addEventListener(
    "change",
    updatePaymentInstructions
  );

}


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
        payment ===
          "Airtel Money" ||
        payment ===
          "Mpamba"
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
    "Starting OneKhusa payment for:",
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
      "Invalid payment function response:",
      responseText
    );


    throw new Error(
      "PAYMENT_FUNCTION_INVALID_RESPONSE"
    );

  }


  if (
    !response.ok ||
    !result.success ||
    !result.checkoutUrl
  ) {

    console.error(
      "OneKhusa payment error:",
      result
    );


    throw new Error(
      result.error ||
      "PAYMENT_INITIALIZATION_FAILED"
    );

  }


  return result.checkoutUrl;

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
   PLACE ORDER
========================================================= */

const checkoutForm =
  document.getElementById(
    "checkoutForm"
  );


if (checkoutForm) {

  checkoutForm.addEventListener(
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


      /* ===================================================
         CHECK CURRENT STOCK
      =================================================== */

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


      /* ===================================================
         FORM DATA
      =================================================== */

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


      const selectedMobileNumber =
        String(
          formData.get(
            "mobileMoneyPhone"
          ) || ""
        ).trim();


      /* ===================================================
         BASIC VALIDATION
      =================================================== */

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


      /* ===================================================
         VISA NOT READY
      =================================================== */

      if (
        payment ===
        "Visa Card"
      ) {

        alert(
          "Visa Card payment is not connected yet. Please choose Airtel Money, TNM Mpamba, or Cash on delivery / pickup."
        );

        return;
      }


      /* ===================================================
         MOBILE MONEY NUMBER
      =================================================== */

      if (
        (
          payment ===
            "Airtel Money" ||
          payment ===
            "Mpamba"
        ) &&
        !selectedMobileNumber
      ) {

        alert(
          "Please enter your mobile-money number."
        );

        return;
      }


      /* ===================================================
         TOTAL
      =================================================== */

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


      /* ===================================================
         BUTTON
      =================================================== */

      const submitButton =
        this.querySelector(
          'button[type="submit"]'
        );


      if (submitButton) {

        submitButton.disabled =
          true;


        submitButton.textContent =
          (
            payment ===
              "Airtel Money" ||
            payment ===
              "Mpamba"
          )
            ? "STARTING PAYMENT..."
            : "PLACING ORDER...";

      }


      try {

        /* =================================================
           CREATE ORDER
        ================================================= */

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


        /* =================================================
           MOBILE MONEY
        ================================================= */

        if (
          payment ===
            "Airtel Money" ||
          payment ===
            "Mpamba"
        ) {

          showOrderResult(
            orderNumber,
            "Opening secure OneKhusa payment checkout..."
          );


          try {

            const checkoutUrl =
              await startOneKhusaPayment(
                orderNumber
              );


            /*
              Save order number locally so
              it can be recovered if the
              customer returns to VALAR.
            */

            localStorage.setItem(
              "valarPendingPaymentOrder",
              orderNumber
            );


            /*
              Keep the cart until the payment
              flow has started successfully.
            */

            window.location.href =
              checkoutUrl;


            return;

          }

          catch (paymentError) {

            console.error(
              "OneKhusa start error:",
              paymentError
            );


            alert(
              "Your order was created, but we could not start the OneKhusa payment. Please try again or contact VALAR with your order number: " +
              orderNumber
            );


            showOrderResult(
              orderNumber,
              "Payment could not be started. Keep this order number and contact VALAR if necessary."
            );


            return;

          }

        }


        /* =================================================
           CASH ORDER
        ================================================= */

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

}


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