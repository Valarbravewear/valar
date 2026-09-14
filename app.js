/* =========================================================
   VALAR CUSTOMER STORE
   SUPABASE + CASH ON DELIVERY / PICKUP + STOCK REQUESTS
========================================================= */

let products = [];

let cart = JSON.parse(
  localStorage.getItem("valarCart") || "[]"
);

let selectedCategory = "All";

/*
   Current quantity being requested from VALAR.
   This is the ADDITIONAL quantity needed beyond
   the currently available stock.
*/
let stockRequestQuantity = 1;


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


    /* -----------------------------------------------------
       CLEAN INVALID CART ITEMS
    ----------------------------------------------------- */

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
                onclick="${
                  soldOut
                    ? `openStockRequestById('${escapeHtml(product.id)}')`
                    : `addToCart('${escapeHtml(product.id)}')`
                }"
              >
                ${
                  soldOut
                    ? "REQUEST STOCK"
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


  /* -------------------------------------------------------
     PRODUCT COMPLETELY SOLD OUT
  ------------------------------------------------------- */

  if (Number(product.stock) <= 0) {

    openStockRequest(
      product,
      1
    );

    return;
  }


  const existing =
    cart.find(
      item =>
        String(item.id) ===
        String(id)
    );


  /* -------------------------------------------------------
     EXISTING CART ITEM
  ------------------------------------------------------- */

  if (existing) {

    const nextQuantity =
      Number(existing.qty) + 1;


    /* ---------------------------------------------------
       CUSTOMER HAS REACHED AVAILABLE STOCK
    --------------------------------------------------- */

    if (
      nextQuantity >
      Number(product.stock)
    ) {

      const extraQuantity =
        nextQuantity -
        Number(product.stock);


      openStockRequest(
        product,
        extraQuantity
      );

      return;
    }


    existing.qty =
      nextQuantity;

  }

  /* -------------------------------------------------------
     NEW CART ITEM
  ------------------------------------------------------- */

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
    Number(item.qty) +
    Number(amount);


  /* =====================================================
     REMOVE ITEM
  ====================================================== */

  if (newQuantity <= 0) {

    removeFromCart(id);

    return;
  }


  /* =====================================================
     STOCK LIMIT REACHED
  ====================================================== */

  if (
    newQuantity >
    Number(product.stock)
  ) {

    const extraQuantity =
      newQuantity -
      Number(product.stock);


    openStockRequest(
      product,
      extraQuantity
    );

    return;
  }


  /* =====================================================
     NORMAL QUANTITY CHANGE
  ====================================================== */

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


  const checkoutTotalElement =
    document.getElementById(
      "checkoutTotal"
    );


  if (checkoutTotalElement) {

    checkoutTotalElement.textContent =
      money(cartTotal());

  }


  /*
     Clear any previous order confirmation
     when opening a new checkout.
  */

  const orderResult =
    document.getElementById(
      "orderResult"
    );


  if (orderResult) {

    orderResult.innerHTML =
      "";

  }


  const submitButton =
    document.querySelector(
      '#checkoutForm button[type="submit"]'
    );


  if (submitButton) {

    submitButton.disabled =
      false;

    submitButton.textContent =
      "PLACE ORDER";

  }


  /*
     Set the payment method back to
     Cash on delivery / pickup.
  */

  if (paymentMethod) {

    paymentMethod.value =
      "Cash on delivery / pickup";

  }


  updatePaymentInstructions();


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
   CASH ONLY
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


function updatePaymentInstructions() {

  const method =
    paymentMethod?.value || "";


  if (!paymentInstructions) {
    return;
  }


  if (
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


    return;

  }


  paymentInstructions.hidden =
    true;

}


paymentMethod?.addEventListener(
  "change",
  updatePaymentInstructions
);


/* =========================================================
   STOCK REQUEST
========================================================= */


/* =========================================================
   OPEN STOCK REQUEST BY PRODUCT ID
========================================================= */

function openStockRequestById(id) {

  const product =
    products.find(
      item =>
        String(item.id) ===
        String(id)
    );


  if (!product) {
    return;
  }


  openStockRequest(
    product,
    1
  );

}


/* =========================================================
   UPDATE STOCK REQUEST QUANTITY
========================================================= */

function updateStockRequestQuantity() {

  const requestedQty =
    document.getElementById(
      "stockRequestRequestedQty"
    );

  const extraQty =
    document.getElementById(
      "stockRequestExtraQty"
    );

  const extraDisplay =
    document.getElementById(
      "stockRequestExtraDisplay"
    );

  const quantityDisplay =
    document.getElementById(
      "stockRequestQuantityDisplay"
    );


  stockRequestQuantity =
    Math.max(
      1,
      Number(stockRequestQuantity) || 1
    );


  if (requestedQty) {

    requestedQty.value =
      stockRequestQuantity;

  }


  if (extraQty) {

    extraQty.value =
      stockRequestQuantity;

  }


  if (extraDisplay) {

    extraDisplay.textContent =
      stockRequestQuantity;

  }


  if (quantityDisplay) {

    quantityDisplay.textContent =
      stockRequestQuantity;

  }

}


/* =========================================================
   OPEN STOCK REQUEST
========================================================= */

function openStockRequest(
  product,
  initialQuantity = 1
) {

  const backdrop =
    document.getElementById(
      "stockRequestBackdrop"
    );

  const productId =
    document.getElementById(
      "stockRequestProductId"
    );

  const message =
    document.getElementById(
      "stockRequestMessage"
    );

  const result =
    document.getElementById(
      "stockRequestResult"
    );


  if (!backdrop || !product) {
    return;
  }


  stockRequestQuantity =
    Math.max(
      1,
      Number(initialQuantity) || 1
    );


  if (productId) {

    productId.value =
      product.id;

  }


  if (message) {

    const currentStock =
      Number(product.stock) || 0;


    message.textContent =
      currentStock > 0

        ? `${product.name} has ${currentStock} item(s) currently available. How many additional item(s) would you like to request?`

        : `${product.name} is currently out of stock. How many item(s) would you like to request?`;

  }


  if (result) {

    result.innerHTML =
      "";

  }


  /* =====================================================
     CREATE QUANTITY CONTROLS
  ====================================================== */

  let quantityControls =
    document.getElementById(
      "stockRequestQuantityControls"
    );


  if (!quantityControls) {

    quantityControls =
      document.createElement("div");

    quantityControls.id =
      "stockRequestQuantityControls";

    quantityControls.style.cssText = `
      display:flex;
      align-items:center;
      justify-content:center;
      gap:16px;
      margin:16px 0;
    `;


    const minusButton =
      document.createElement("button");

    minusButton.id =
      "stockRequestMinus";

    minusButton.type =
      "button";

    minusButton.textContent =
      "−";

    minusButton.setAttribute(
      "aria-label",
      "Decrease requested quantity"
    );

    minusButton.style.cssText = `
      width:44px;
      height:44px;
      border:1px solid currentColor;
      border-radius:8px;
      background:transparent;
      font-size:24px;
      font-weight:700;
      cursor:pointer;
    `;


    const quantityDisplay =
      document.createElement("strong");

    quantityDisplay.id =
      "stockRequestQuantityDisplay";

    quantityDisplay.textContent =
      "1";

    quantityDisplay.style.cssText = `
      min-width:35px;
      text-align:center;
      font-size:1.2rem;
    `;


    const plusButton =
      document.createElement("button");

    plusButton.id =
      "stockRequestPlus";

    plusButton.type =
      "button";

    plusButton.textContent =
      "+";

    plusButton.setAttribute(
      "aria-label",
      "Increase requested quantity"
    );

    plusButton.style.cssText = `
      width:44px;
      height:44px;
      border:1px solid currentColor;
      border-radius:8px;
      background:transparent;
      font-size:24px;
      font-weight:700;
      cursor:pointer;
    `;


    minusButton.addEventListener(
      "click",
      function () {

        stockRequestQuantity =
          Math.max(
            1,
            stockRequestQuantity - 1
          );

        updateStockRequestQuantity();

      }
    );


    plusButton.addEventListener(
      "click",
      function () {

        stockRequestQuantity += 1;

        updateStockRequestQuantity();

      }
    );


    quantityControls.appendChild(
      minusButton
    );

    quantityControls.appendChild(
      quantityDisplay
    );

    quantityControls.appendChild(
      plusButton
    );


    const form =
      document.getElementById(
        "stockRequestForm"
      );


    if (form) {

      form.parentNode.insertBefore(
        quantityControls,
        form
      );

    }

  }


  updateStockRequestQuantity();


  backdrop.classList.add(
    "show"
  );

}


/* =========================================================
   CLOSE STOCK REQUEST
========================================================= */

function closeStockRequest() {

  document
    .getElementById(
      "stockRequestBackdrop"
    )
    ?.classList.remove("show");

}


document
  .getElementById("closeStockRequest")
  ?.addEventListener(
    "click",
    closeStockRequest
  );


document
  .getElementById("stockRequestBackdrop")
  ?.addEventListener(
    "click",
    event => {

      const backdrop =
        document.getElementById(
          "stockRequestBackdrop"
        );


      if (
        event.target ===
        backdrop
      ) {

        closeStockRequest();

      }

    }
  );


/* =========================================================
   SUBMIT STOCK REQUEST
========================================================= */

document
  .getElementById("stockRequestForm")
  ?.addEventListener(
    "submit",
    async function(event) {

      event.preventDefault();


      if (!window.valarSupabase) {

        alert(
          "VALAR store connection is not available."
        );

        return;

      }


      const nameInput =
        document.getElementById(
          "stockRequestName"
        );

      const phoneInput =
        document.getElementById(
          "stockRequestPhone"
        );


      const productId =
        document.getElementById(
          "stockRequestProductId"
        )?.value;


      const requestedQuantity =
        Math.max(
          1,
          Number(stockRequestQuantity) || 1
        );


      const extraQuantity =
        requestedQuantity;


      const customerName =
        String(
          nameInput?.value || ""
        ).trim();


      const phone =
        String(
          phoneInput?.value || ""
        ).trim();


      if (
        !customerName ||
        !phone ||
        !productId ||
        extraQuantity <= 0
      ) {

        alert(
          "Please complete all fields."
        );

        return;

      }


      const product =
        products.find(
          item =>
            String(item.id) ===
            String(productId)
        );


      if (!product) {

        alert(
          "This product could not be found."
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
          "SENDING...";

      }


      try {

        const {
          error
        } =
          await window.valarSupabase
            .from("stock_requests")
            .insert({

              product_id:
                product.id,

              product_name:
                product.name,

              customer_name:
                customerName,

              phone:
                phone,

              current_stock:
                Number(product.stock) || 0,

              requested_quantity:
                requestedQuantity,

              additional_quantity:
                extraQuantity,

              status:
                "pending"

            });


        if (error) {

          console.error(
            "Stock request error:",
            error
          );

          throw error;

        }


        const result =
          document.getElementById(
            "stockRequestResult"
          );


        if (result) {

          result.innerHTML = `

            <strong>
              Request sent successfully
            </strong>

            <p>
              Your request for
              <strong>
                ${escapeHtml(
                  String(requestedQuantity)
                )}
              </strong>
              item(s) has been sent to VALAR.
            </p>

            <p>
              We will contact you on
              <strong>
                ${escapeHtml(phone)}
              </strong>
              when the stock is available.
            </p>

          `;

        }


        if (nameInput) {
          nameInput.value = "";
        }

        if (phoneInput) {
          phoneInput.value = "";
        }


        stockRequestQuantity = 1;

        updateStockRequestQuantity();

      }

      catch (error) {

        console.error(
          "Unable to send stock request:",
          error
        );


        alert(
          "We could not send your stock request. Please try again."
        );

      }

      finally {

        if (submitButton) {

          const result =
            document.getElementById(
              "stockRequestResult"
            );


          const successful =
            result &&
            result.textContent.includes(
              "Request sent successfully"
            );


          if (successful) {

            submitButton.disabled =
              true;

            submitButton.textContent =
              "REQUEST SENT";

          }

          else {

            submitButton.disabled =
              false;

            submitButton.textContent =
              "SEND REQUEST";

          }

        }

      }

    }
  );


/* =========================================================
   CREATE CASH ORDER
========================================================= */

async function createValarOrder({

  customerName,
  phone,
  location,
  total

}) {

  /*
     VALAR currently accepts only:
     Cash on delivery / pickup
  */

  const payment =
    "Cash on delivery / pickup";


  const orderNumber =
    "VALAR-" +
    Date.now()
      .toString()
      .slice(-8);


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
      "cash_pending",

    payment_provider:
      null,

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


      if (!product) {
        return null;
      }


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

    })
    .filter(Boolean);


  if (!orderItems.length) {

    await window.valarSupabase
      .from("orders")
      .delete()
      .eq(
        "id",
        createdOrder.id
      );


    throw new Error(
      "NO_ORDER_ITEMS"
    );

  }


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


    /*
       Remove the parent order if the
       order items could not be created.
    */

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


    /* -----------------------------------------------------
       BASIC VALIDATION
    ----------------------------------------------------- */

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


    /*
       Extra safety:
       only Cash on delivery / pickup
       is accepted at the moment.
    */

    if (
      payment !==
      "Cash on delivery / pickup"
    ) {

      alert(
        "Please select Cash on delivery / pickup."
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
        "PLACING ORDER...";

    }


    try {

      /* ---------------------------------------------------
         CREATE CASH ORDER
      --------------------------------------------------- */

      const createdOrder =
        await createValarOrder({

          customerName:
            customerName,

          phone:
            phone,

          location:
            location,

          total:
            total

        });


      const orderNumber =
        createdOrder.order_number;


      /* ---------------------------------------------------
         SHOW CASH ORDER CONFIRMATION
      --------------------------------------------------- */

      const orderResult =
        document.getElementById(
          "orderResult"
        );


      if (orderResult) {

        orderResult.innerHTML = `

          <div class="payment-instructions">

            <strong>
              Order ${escapeHtml(orderNumber)} received.
            </strong>

            <p>
              Please keep this number for reference.
            </p>

            <p>
              Pay cash when your order is delivered
              or when you collect it.
            </p>

          </div>

        `;

      }


      /* ---------------------------------------------------
         CLEAR SHOPPING CART
      --------------------------------------------------- */

      cart = [];

      saveCart();


      /* ---------------------------------------------------
         RESET CHECKOUT FORM
      --------------------------------------------------- */

      this.reset();


      /*
         The payment select is now reset to
         "Choose payment", but the order
         confirmation remains visible below.
      */

      if (paymentInstructions) {

        paymentInstructions.hidden =
          true;

      }


      /* ---------------------------------------------------
         KEEP CONFIRMATION VISIBLE
      --------------------------------------------------- */

      if (submitButton) {

        submitButton.disabled =
          true;

        submitButton.textContent =
          "ORDER RECEIVED";

      }


      /*
         IMPORTANT:
         Do NOT close the checkout modal.
         The customer needs to see the
         order confirmation.
      */

      return;

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

      /*
         Do not reset the successful
         confirmation button.
      */

      if (
        submitButton &&
        submitButton.textContent !==
          "ORDER RECEIVED"
      ) {

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