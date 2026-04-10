ARG PYTHON_IMAGE=python:3.13

FROM ${PYTHON_IMAGE} AS runtime

LABEL authors="leemysw"
LABEL description="Nexus"

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PYTHONPATH=/opt/app

ARG PIP_INDEX_URL=
ARG NPM_REGISTRY=https://registry.npmjs.org/

RUN --mount=type=cache,target=/var/cache/apt \
    apt-get update && \
    apt-get install -y --no-install-recommends \
    bash \
    ca-certificates \
    git \
    nodejs \
    npm && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /opt/app

COPY agent/requirements.txt /tmp/requirements.txt

RUN --mount=type=cache,target=/root/.cache/pip \
    if [ -n "${PIP_INDEX_URL}" ]; then \
        pip config set global.index-url "${PIP_INDEX_URL}"; \
    fi && \
    pip install --upgrade pip && \
    pip install -r /tmp/requirements.txt

RUN npm config set registry "${NPM_REGISTRY}" && \
    npm install -g @anthropic-ai/claude-code && \
    npm cache clean --force

RUN groupadd --system --gid 1001 agent && \
    useradd --system --uid 1001 --gid agent --shell /bin/bash --create-home agent && \
    mkdir -p /opt/app/deploy /home/agent/.nexus

COPY main.py pyproject.toml alembic.ini /opt/app/
COPY alembic /opt/app/alembic
COPY agent /opt/app/agent
COPY skills /opt/app/skills
COPY deploy/init-db.sh /opt/app/deploy/init-db.sh

RUN chmod +x /opt/app/deploy/init-db.sh && \
    chown -R agent:agent /opt/app /home/agent

USER agent
ENV HOME=/home/agent

EXPOSE 8010

ENTRYPOINT ["/opt/app/deploy/init-db.sh"]
CMD ["gunicorn", "-c", "agent/config/config_gunicorn.py", "main:app"]
