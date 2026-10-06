from flask import (
    Flask,
    render_template,
    request,
    jsonify,
    session,
    redirect,
    url_for
)

from google import genai
from dotenv import load_dotenv
from werkzeug.utils import secure_filename

import os
import time


# ==========================================
# LOAD .ENV
# ==========================================

load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")


# ==========================================
# FLASK
# ==========================================

app = Flask(__name__)

# Secret key for login session
app.secret_key = os.getenv(
    "FLASK_SECRET_KEY",
    "studyai-local-secret-key-2026"
)

app.config["MAX_CONTENT_LENGTH"] = 100 * 1024 * 1024

UPLOAD_FOLDER = "uploads"

os.makedirs(
    UPLOAD_FOLDER,
    exist_ok=True
)


# ==========================================
# LOGIN DETAILS
# ==========================================

DEMO_USERNAME = "Siddhi More"
DEMO_PASSWORD = "Siddhi@123"


# ==========================================
# GEMINI
# ==========================================

client = None

if API_KEY:

    try:

        client = genai.Client(
            api_key=API_KEY
        )

        print("✅ Gemini API connected")

    except Exception as e:

        print(
            "❌ Gemini connection error:",
            e
        )

else:

    print(
        "❌ GEMINI_API_KEY not found"
    )


MODEL = "gemini-3.5-flash-lite"


# ==========================================
# FAST LOCAL ANSWERS
# ==========================================

answers = {

    "what is ai":
        "AI (Artificial Intelligence) is technology that allows computers to perform tasks that normally require human intelligence.",

    "what is artificial intelligence":
        "Artificial Intelligence is the ability of computers to perform tasks that normally require human intelligence.",

    "what is machine learning":
        "Machine Learning is a part of AI where computers learn patterns from data and use them to make predictions or decisions.",

    "what is data structure":
        "A data structure is a way of organizing and storing data efficiently. Examples include arrays, linked lists, stacks, queues and trees.",

    "what is java":
        "Java is a high-level, object-oriented programming language used for software, web and application development.",

    "what is python":
        "Python is a high-level programming language known for its simple syntax. It is widely used in AI, data science, web development and automation.",

    "what is html":
        "HTML stands for HyperText Markup Language. It is used to create the structure of web pages.",

    "what is css":
        "CSS stands for Cascading Style Sheets. It is used to control the appearance and layout of web pages.",

    "what is javascript":
        "JavaScript is a programming language used to make websites interactive and dynamic.",

    "what is computer network":
        "A computer network is a group of connected computers and devices that communicate and share resources.",

    "what is dbms":
        "DBMS stands for Database Management System. It is software used to store, manage and retrieve data from databases.",

    "what is operating system":
        "An operating system is system software that manages computer hardware, software and system resources.",

    "what is stack":
        "A stack is a linear data structure that follows LIFO: Last In, First Out.",

    "what is queue":
        "A queue is a linear data structure that follows FIFO: First In, First Out.",

    "what is linked list":
        "A linked list is a data structure made of nodes. Each node contains data and a link to another node.",

    "what is array":
        "An array is a collection of elements stored in memory and accessed using an index.",

    "what is algorithm":
        "An algorithm is a step-by-step procedure used to solve a problem.",

    "what is cloud computing":
        "Cloud computing means using computing resources such as servers, storage and software over the internet.",

    "what is blockchain":
        "Blockchain is a distributed digital ledger that stores information in linked blocks.",

    "what is iot":
        "IoT stands for Internet of Things. It refers to physical devices connected to the internet that can collect and exchange data.",

    "what is cybersecurity":
        "Cybersecurity is the practice of protecting computers, networks and data from unauthorized access and attacks.",

    "what is deep learning":
        "Deep Learning is a branch of machine learning that uses multi-layer neural networks to learn complex patterns."
}


# ==========================================
# HELPER
# ==========================================

def clean_text(text):

    return " ".join(
        text.lower().strip().split()
    )


# ==========================================
# LOCAL RESPONSE
# ==========================================

def get_local_answer(message):

    question = clean_text(
        message
    )

    greetings = [
        "hi",
        "hello",
        "hey",
        "hii",
        "hiii"
    ]

    if question in greetings:

        return (
            "Hello! 👋 How can I help you?"
        )


    if question in [
        "what is your name",
        "what's your name",
        "who are you"
    ]:

        return (
            "I'm StudyAI, your AI Assistant. 🤖"
        )


    if question in [
        "what can you do",
        "how can you help me"
    ]:

        return (
            "I can answer questions, explain concepts, "
            "help with programming and analyze supported files, "
            "images, audio and video."
        )


    return answers.get(
        question
    )


# ==========================================
# GEMINI TEXT RESPONSE
# ==========================================

def ask_gemini(message):

    if client is None:

        return (
            "Gemini is not connected. "
            "Please check your .env file."
        )


    try:

        prompt = f"""
You are StudyAI, a helpful AI assistant.

Answer the user's question directly.

Use simple and clear language.

You can answer general questions,
technical questions,
programming questions and study questions.

Do not say that you are only a study assistant.

User question:
{message}
"""


        start_time = time.time()


        response = client.models.generate_content(

            model=MODEL,

            contents=prompt

        )


        elapsed = round(
            time.time() - start_time,
            2
        )


        print(
            f"✅ Gemini response received in {elapsed} seconds"
        )


        if response and response.text:

            return response.text.strip()


        return (
            "I could not generate a response."
        )


    except Exception as e:

        print(
            "❌ Gemini ERROR:"
        )

        print(
            type(e).__name__
        )

        print(
            str(e)
        )


        return (
            "I could not generate a response. "
            "Please try again."
        )


# ==========================================
# VIDEO READY CHECK
# ==========================================

def wait_until_ready(file_object):

    for _ in range(20):

        try:

            state = getattr(
                file_object,
                "state",
                None
            )


            if state is None:

                return file_object


            state_name = getattr(

                state,

                "name",

                str(state)

            )


            print(
                "File state:",
                state_name
            )


            if "ACTIVE" in state_name.upper():

                return file_object


            if "FAILED" in state_name.upper():

                return None


            time.sleep(2)


            file_object = client.files.get(

                name=file_object.name

            )


        except Exception as e:

            print(
                "File state error:",
                e
            )

            return None


    return None


# ==========================================
# FILE / PHOTO / AUDIO / VIDEO
# ==========================================

def analyze_files(
    message,
    saved_files
):

    if client is None:

        return (
            "Gemini is not connected."
        )


    gemini_files = []


    try:

        for filepath in saved_files:

            print(
                "📤 Uploading:",
                filepath
            )


            uploaded = client.files.upload(

                file=filepath

            )


            print(
                "✅ Uploaded:",
                uploaded.name
            )


            mime_type = getattr(

                uploaded,

                "mime_type",

                ""

            ) or ""


            if mime_type.startswith(
                "video/"
            ):

                print(
                    "🎥 Processing video..."
                )


                uploaded = wait_until_ready(

                    uploaded

                )


                if uploaded is None:

                    return (
                        "The video could not be processed."
                    )


            gemini_files.append(
                uploaded
            )


        if message.strip():

            user_request = message

        else:

            user_request = (
                "Analyze the uploaded file and explain "
                "the important information in simple language."
            )


        prompt = f"""
You are StudyAI.

Analyze the uploaded file or media.

The user asked:
{user_request}

Give a clear and useful answer.
Use simple language.
"""


        contents = [
            prompt
        ]


        for file_object in gemini_files:

            contents.append(
                file_object
            )


        start_time = time.time()


        response = client.models.generate_content(

            model=MODEL,

            contents=contents

        )


        elapsed = round(

            time.time() - start_time,

            2

        )


        print(
            f"✅ File analysis completed in {elapsed} seconds"
        )


        if response and response.text:

            return response.text.strip()


        return (
            "I could not analyze the uploaded file."
        )


    except Exception as e:

        print(
            "❌ FILE ERROR:"
        )

        print(
            type(e).__name__
        )

        print(
            str(e)
        )


        return (
            "I received the file, but I could not analyze it. "
            "Please check the file format and try again."
        )


# ==========================================
# LOGIN PAGE
# ==========================================

@app.route(
    "/login",
    methods=["GET", "POST"]
)
def login():

    # Already logged in
    if session.get("logged_in"):

        return redirect(
            url_for("home")
        )


    error = None


    if request.method == "POST":

        username = request.form.get(
            "username",
            ""
        ).strip()


        password = request.form.get(
            "password",
            ""
        )


        if (
            username.lower()
            == DEMO_USERNAME.lower()
            and password
            == DEMO_PASSWORD
        ):

            session["logged_in"] = True

            session["user_name"] = (
                DEMO_USERNAME
            )


            return redirect(
                url_for("home")
            )


        error = (
            "Incorrect username or password."
        )


    return render_template(
        "login.html",
        error=error
    )


# ==========================================
# LOGOUT
# ==========================================

@app.route("/logout")
def logout():

    session.clear()

    return redirect(
        url_for("login")
    )


# ==========================================
# HOME
# ==========================================

@app.route("/")
def home():

    if not session.get(
        "logged_in"
    ):

        return redirect(
            url_for("login")
        )


    return render_template(

        "index.html",

        user_name=session.get(
            "user_name",
            DEMO_USERNAME
        )

    )


# ==========================================
# CHAT
# ==========================================

@app.route(
    "/chat",
    methods=["POST"]
)
def chat():

    # Login protection
    if not session.get(
        "logged_in"
    ):

        return jsonify({

            "response":
                "Your session has expired. Please log in again."

        }), 401


    try:

        message = request.form.get(

            "message",

            ""

        ).strip()


        files = request.files.getlist(
            "files"
        )


        # --------------------------------------
        # FILE REQUEST
        # --------------------------------------

        valid_files = []


        for file in files:

            if file and file.filename:

                filename = secure_filename(

                    file.filename

                )


                if filename:

                    filepath = os.path.join(

                        UPLOAD_FOLDER,

                        filename

                    )


                    file.save(
                        filepath
                    )


                    valid_files.append(
                        filepath
                    )


        if valid_files:

            print(
                "📁 File request received"
            )


            answer = analyze_files(

                message,

                valid_files

            )


            return jsonify({

                "response": answer

            })


        # --------------------------------------
        # EMPTY MESSAGE
        # --------------------------------------

        if not message:

            return jsonify({

                "response":
                    "Please enter a question."

            })


        # --------------------------------------
        # LOCAL FAST ANSWER
        # --------------------------------------

        local_answer = get_local_answer(

            message

        )


        if local_answer:

            print(
                "⚡ Fast local answer"
            )


            return jsonify({

                "response":
                    local_answer

            })


        # --------------------------------------
        # GEMINI
        # --------------------------------------

        print(
            "🤖 Sending to Gemini..."
        )


        answer = ask_gemini(
            message
        )


        return jsonify({

            "response":
                answer

        })


    except Exception as e:

        print(
            "❌ SERVER ERROR:"
        )

        print(
            type(e).__name__
        )

        print(
            str(e)
        )


        return jsonify({

            "response":
                "Something went wrong. Please try again."

        }), 500


# ==========================================
# FILE TOO LARGE
# ==========================================

@app.errorhandler(413)
def file_too_large(error):

    return jsonify({

        "response":
            "File is too large. Please upload a file below 100 MB."

    }), 413


# ==========================================
# RUN
# ==========================================

if __name__ == "__main__":

    print()

    print(
        "========================================"
    )

    print(
        "          StudyAI Chatbot"
    )

    print(
        "========================================"
    )

    print(
        "🔐 Login system"
    )

    print(
        "⚡ Fast local answers"
    )

    print(
        "🤖 Gemini random questions"
    )

    print(
        "📄 File support"
    )

    print(
        "🖼️ Photo support"
    )

    print(
        "🎵 Audio support"
    )

    print(
        "🎥 Video support"
    )

    print(
        "========================================"
    )

    print()


    app.run(

        host="127.0.0.1",

        port=5000,

        debug=False,

        use_reloader=False

    )